#!/usr/bin/env node

/**
 * SolSignal Twitter Bot — Agent #982 (batman)
 *
 * Posts resolved signal results and new signal batches to Twitter/X.
 * Uses raw fetch with OAuth 1.0a HMAC-SHA1 signing — no npm packages required.
 *
 * Usage:
 *   node scripts/twitter-bot.js              # Post tweets
 *   node scripts/twitter-bot.js --dry-run    # Preview without posting
 *
 * Required env vars:
 *   TWITTER_API_KEY, TWITTER_API_SECRET,
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 *
 * State: data/last-tweet.json
 * Logs:  logs/twitter-bot.log
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Resolve @solana/web3.js from dashboard's node_modules (same pattern as other scripts)
const DASHBOARD_MODULES = path.join(__dirname, "../dashboard/node_modules");
const { Connection, PublicKey } = require(path.join(DASHBOARD_MODULES, "@solana/web3.js"));

// ── Config ──────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");
const RPC_URL = "https://api.devnet.solana.com";
const TWITTER_API_URL = "https://api.twitter.com/2/tweets";

const STATE_FILE = path.join(__dirname, "../data/last-tweet.json");
const LOG_FILE = path.join(__dirname, "../logs/twitter-bot.log");

const DRY_RUN = process.argv.includes("--dry-run");

// ── Logging ─────────────────────────────────────────────────────
function ensureDir(filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    ensureDir(LOG_FILE);
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

// ── State Management ────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { lastTweetedAt: 0, tweetedSignals: [], lastBatchAt: 0 };
  }
}

function saveState(state) {
  ensureDir(STATE_FILE);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── OAuth 1.0a HMAC-SHA1 ───────────────────────────────────────
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function generateNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function hmacSha1(baseString, signingKey) {
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildOAuthHeader(method, url, body, credentials) {
  const { apiKey, apiSecret, accessToken, accessSecret } = credentials;

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // For POST with JSON body, only OAuth params go into signature base
  // (Twitter v2 uses JSON body, not form-encoded)
  const allParams = { ...oauthParams };

  // Sort parameters
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  // Build signature base string
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  // Build signing key
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;

  // Sign
  const signature = hmacSha1(signatureBase, signingKey);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${authParts}`;
}

// ── Twitter API ─────────────────────────────────────────────────
async function postTweet(text, credentials) {
  if (DRY_RUN) {
    log(`[DRY-RUN] Would tweet (${text.length} chars):\n${text}`);
    return { id: "dry-run-" + Date.now(), text };
  }

  const authHeader = buildOAuthHeader("POST", TWITTER_API_URL, { text }, credentials);

  const res = await fetch(TWITTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.detail || data.title || JSON.stringify(data);
    throw new Error(`Twitter API ${res.status}: ${errMsg}`);
  }

  log(`✅ Tweet posted: ${data.data?.id}`);
  return data.data;
}

// ── On-Chain Signal Fetching ────────────────────────────────────
async function fetchSignals() {
  const connection = new Connection(RPC_URL, "confirmed");
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 220 }],
  });

  const signals = accounts
    .map((account) => {
      try {
        const data = account.account.data;
        let offset = 8;

        const agent = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const index = Number(data.readBigUInt64LE(offset));
        offset += 8;

        const assetLen = data.readUInt32LE(offset);
        offset += 4;
        const asset = data.slice(offset, offset + assetLen).toString("utf8");
        offset += assetLen;

        const dirByte = data[offset];
        offset += 1;
        const direction = dirByte === 0 ? "long" : "short";

        const confidence = data[offset];
        offset += 1;

        const entryPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
        offset += 8;

        const targetPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
        offset += 8;

        const stopLoss = Number(data.readBigUInt64LE(offset)) / 1e6;
        offset += 8;

        const timeHorizon = Number(data.readBigInt64LE(offset)) * 1000;
        offset += 8;

        offset += 32; // reasoning hash

        const createdAt = Number(data.readBigInt64LE(offset)) * 1000;
        offset += 8;

        const resolved = data[offset] === 1;
        offset += 1;

        const outcomeByte = data[offset];
        offset += 1;
        const outcome =
          outcomeByte === 0 ? "pending"
          : outcomeByte === 1 ? "correct"
          : outcomeByte === 2 ? "incorrect"
          : "expired";

        const resolutionPrice = Number(data.readBigUInt64LE(offset)) / 1e6;

        return {
          publicKey: account.pubkey.toBase58(),
          agent, index, asset, direction, confidence,
          entryPrice, targetPrice, stopLoss, timeHorizon,
          createdAt, resolved, outcome, resolutionPrice,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  signals.sort((a, b) => b.createdAt - a.createdAt);
  return signals;
}

// ── Tweet Composition ───────────────────────────────────────────
function composeResolvedTweet(signal) {
  const isCorrect = signal.outcome === "correct";
  const emoji = isCorrect ? "✅" : "❌";
  const dirEmoji = signal.direction === "long" ? "📈" : "📉";

  const pnl =
    signal.entryPrice > 0 && signal.resolutionPrice > 0
      ? signal.direction === "long"
        ? ((signal.resolutionPrice - signal.entryPrice) / signal.entryPrice * 100).toFixed(1)
        : ((signal.entryPrice - signal.resolutionPrice) / signal.entryPrice * 100).toFixed(1)
      : null;

  const pnlStr = pnl !== null ? ` (${parseFloat(pnl) >= 0 ? "+" : ""}${pnl}%)` : "";

  return [
    `${emoji} Signal Resolved: ${signal.asset}`,
    ``,
    `${dirEmoji} ${signal.direction.toUpperCase()} @ $${signal.entryPrice.toFixed(2)}`,
    `🎯 Target: $${signal.targetPrice.toFixed(2)}`,
    `📊 Resolution: $${signal.resolutionPrice.toFixed(2)}${pnlStr}`,
    `🔮 Confidence was: ${signal.confidence}%`,
    ``,
    `Result: ${isCorrect ? "HIT ✅" : "MISS ❌"}`,
    ``,
    `#SolSignal #Solana #DeFi #AI`,
  ].join("\n");
}

function composeBatchTweet(signals) {
  const count = signals.length;
  const assets = [...new Set(signals.map((s) => s.asset))];
  const avgConf = Math.round(
    signals.reduce((sum, s) => sum + s.confidence, 0) / count
  );
  const longs = signals.filter((s) => s.direction === "long").length;
  const shorts = count - longs;

  const assetList = assets.slice(0, 5).join(", ");
  const moreText = assets.length > 5 ? ` +${assets.length - 5} more` : "";

  return [
    `🦇 batman just published ${count} new signal${count > 1 ? "s" : ""}!`,
    ``,
    `📊 Assets: ${assetList}${moreText}`,
    `📈 ${longs} Long / 📉 ${shorts} Short`,
    `🔮 Avg confidence: ${avgConf}%`,
    ``,
    signals
      .slice(0, 3)
      .map(
        (s) =>
          `  ${s.direction === "long" ? "🟢" : "🔴"} ${s.asset} ${s.direction.toUpperCase()} ${s.confidence}%`
      )
      .join("\n"),
    count > 3 ? `  ... and ${count - 3} more` : "",
    ``,
    `Live dashboard: solsignal.vercel.app`,
    `#SolSignal #Solana #CryptoSignals`,
  ]
    .filter(Boolean)
    .join("\n");
}

function composePerformanceTweet(signals) {
  const resolved = signals.filter(
    (s) => s.outcome === "correct" || s.outcome === "incorrect"
  );
  if (resolved.length < 3) return null;

  const correct = resolved.filter((s) => s.outcome === "correct").length;
  const accuracy = ((correct / resolved.length) * 100).toFixed(1);
  const total = signals.length;
  const pending = signals.filter((s) => s.outcome === "pending").length;

  return [
    `🦇 batman Performance Update`,
    ``,
    `📊 Total signals: ${total}`,
    `✅ Correct: ${correct} | ❌ Incorrect: ${resolved.length - correct}`,
    `🎯 Accuracy: ${accuracy}%`,
    `⏳ Active signals: ${pending}`,
    ``,
    `Fully autonomous AI analyst on @Solana devnet`,
    `solsignal.vercel.app/stats`,
    ``,
    `#SolSignal #AI #DeFi`,
  ].join("\n");
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  log("━".repeat(60));
  log(`🦇 SolSignal Twitter Bot starting${DRY_RUN ? " (DRY RUN)" : ""}...`);

  // Load credentials
  const credentials = {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  };

  if (!DRY_RUN) {
    const missing = Object.entries(credentials)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      log(`❌ Missing env vars: ${missing.join(", ")}`);
      log("Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET");
      process.exit(1);
    }
  }

  // Load state
  const state = loadState();
  log(`📁 Last tweeted at: ${state.lastTweetedAt ? new Date(state.lastTweetedAt).toISOString() : "never"}`);
  log(`📁 Previously tweeted ${state.tweetedSignals.length} signal IDs`);

  // Fetch signals from devnet
  log("🔗 Fetching signals from Solana devnet...");
  let signals;
  try {
    signals = await fetchSignals();
    log(`  Found ${signals.length} signals on-chain`);
  } catch (e) {
    log(`❌ Failed to fetch signals: ${e.message}`);
    process.exit(1);
  }

  const tweetedSet = new Set(state.tweetedSignals);
  let tweeted = 0;

  // 1. Tweet resolved signals we haven't tweeted yet
  const newlyResolved = signals.filter(
    (s) =>
      (s.outcome === "correct" || s.outcome === "incorrect") &&
      !tweetedSet.has(s.publicKey) &&
      s.createdAt > state.lastTweetedAt - 7 * 86400000 // last 7 days
  );

  if (newlyResolved.length > 0) {
    log(`📝 ${newlyResolved.length} newly resolved signals to tweet`);

    // Tweet up to 3 resolved signals per run (rate limit safety)
    for (const signal of newlyResolved.slice(0, 3)) {
      try {
        const text = composeResolvedTweet(signal);
        if (text.length > 280) {
          log(`⚠️ Tweet too long (${text.length}), truncating`);
        }
        await postTweet(text.slice(0, 280), credentials);
        tweetedSet.add(signal.publicKey);
        tweeted++;
        // Rate limit: wait 2s between tweets
        if (!DRY_RUN) await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        log(`❌ Failed to tweet signal ${signal.publicKey.slice(0, 8)}...: ${e.message}`);
      }
    }
  } else {
    log("📝 No new resolved signals to tweet");
  }

  // 2. Tweet new signal batches (once every 6 hours)
  const SIX_HOURS = 6 * 3600 * 1000;
  const newPending = signals.filter(
    (s) => s.outcome === "pending" && s.createdAt > (state.lastBatchAt || 0)
  );

  if (
    newPending.length >= 2 &&
    Date.now() - (state.lastBatchAt || 0) > SIX_HOURS
  ) {
    log(`📦 ${newPending.length} new pending signals — composing batch tweet`);
    try {
      const text = composeBatchTweet(newPending);
      await postTweet(text.slice(0, 280), credentials);
      state.lastBatchAt = Date.now();
      tweeted++;
    } catch (e) {
      log(`❌ Failed to post batch tweet: ${e.message}`);
    }
  }

  // 3. Performance summary (once per day)
  const ONE_DAY = 24 * 3600 * 1000;
  if (Date.now() - (state.lastPerformanceAt || 0) > ONE_DAY) {
    const perfTweet = composePerformanceTweet(signals);
    if (perfTweet) {
      log("📊 Posting daily performance summary");
      try {
        await postTweet(perfTweet.slice(0, 280), credentials);
        state.lastPerformanceAt = Date.now();
        tweeted++;
      } catch (e) {
        log(`❌ Failed to post performance tweet: ${e.message}`);
      }
    }
  }

  // Save state
  state.lastTweetedAt = Date.now();
  state.tweetedSignals = [...tweetedSet].slice(-500); // Keep last 500
  saveState(state);

  log(`✅ Done — ${tweeted} tweet${tweeted !== 1 ? "s" : ""} posted`);
  log("━".repeat(60));
}

main().catch((e) => {
  log(`💀 Fatal error: ${e.message}`);
  process.exit(1);
});
