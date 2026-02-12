#!/usr/bin/env node

/**
 * SolSignal Autonomous Analyst — Agent #982 (batman)
 * 
 * Fully autonomous signal generation and on-chain publishing.
 * Fetches prices, analyzes past performance, calibrates confidence,
 * generates signals with TA reasoning, and publishes to Solana devnet.
 * 
 * Run: node autonomous-analyst.js [--dry-run]
 * Cron: every 30min — cd /home/anish/solsignal && node scripts/autonomous-analyst.js >> logs/cron.log 2>&1
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Connection, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Config ──────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");
const IDL_PATH = path.join(__dirname, "../sol-signal/target/idl/sol_signal.json");
const LOG_FILE = path.join(__dirname, "../logs/autonomous-analyst.log");
const PRICE_HISTORY_FILE = path.join(__dirname, "../data/price-history.json");
const DRY_RUN = process.argv.includes("--dry-run");

// Assets we track — ONLY assets with WORKING Pyth devnet price feeds
// Removed: SUI, AVAX, LINK, WIF, DOGE — these fail to resolve on devnet
const TRACKED_ASSETS = [
  { symbol: "SOL/USDC", base: "SOL", pythFeedId: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" },
  { symbol: "BTC/USDC", base: "BTC", pythFeedId: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { symbol: "ETH/USDC", base: "ETH", pythFeedId: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" },
  { symbol: "JUP/USDC", base: "JUP", pythFeedId: "0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996" },
  { symbol: "BONK/USDC", base: "BONK", pythFeedId: "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419" },
  { symbol: "PYTH/USDC", base: "PYTH", pythFeedId: "0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff" },
  { symbol: "W/USDC", base: "W", pythFeedId: "eff7446475e218517566ea99e72a4abec2e1bd8498b43b7d8331e29dcb059389" },
];

// ── Logging ─────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

// ── Price Fetching (Pyth Hermes) ────────────────────────────────
async function fetchPythPrice(feedId) {
  try {
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&parsed=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.parsed && data.parsed[0]) {
      const p = data.parsed[0].price;
      return {
        price: parseFloat(p.price) * Math.pow(10, p.expo),
        conf: parseFloat(p.conf) * Math.pow(10, p.expo),
        timestamp: data.parsed[0].price.publish_time,
      };
    }
  } catch (e) {
    log(`  ⚠️ Pyth error for feed ${feedId.slice(0,8)}...: ${e.message}`);
  }
  return null;
}

async function fetchAllPrices() {
  const prices = {};
  for (const asset of TRACKED_ASSETS) {
    const data = await fetchPythPrice(asset.pythFeedId);
    if (data) {
      prices[asset.symbol] = { ...data, base: asset.base };
    }
    // Small delay to be nice to Pyth
    await new Promise(r => setTimeout(r, 200));
  }
  return prices;
}

// ── Price History Management ────────────────────────────────────
function loadPriceHistory() {
  try {
    return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function savePriceHistory(history) {
  fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

function updatePriceHistory(history, prices) {
  const now = Date.now();
  for (const [symbol, data] of Object.entries(prices)) {
    if (!history[symbol]) history[symbol] = [];
    history[symbol].push({ price: data.price, ts: now });
    // Keep last 200 data points (covers ~4 days at 30min intervals)
    if (history[symbol].length > 200) {
      history[symbol] = history[symbol].slice(-200);
    }
  }
  return history;
}

// ── Technical Analysis ──────────────────────────────────────────
function calculateTA(symbol, currentPrice, history) {
  const points = (history[symbol] || []).map(p => p.price);
  if (points.length < 3) {
    return { momentum: 0, meanReversion: 0, volatility: 0, trend: "neutral", dataPoints: points.length };
  }

  // Momentum: % change over last N points
  const lookback = Math.min(points.length, 12); // ~6 hours at 30min
  const startPrice = points[points.length - lookback];
  const momentum = ((currentPrice - startPrice) / startPrice) * 100;

  // Mean reversion: distance from rolling average
  const recentN = Math.min(points.length, 24); // ~12 hours
  const avg = points.slice(-recentN).reduce((a, b) => a + b, 0) / recentN;
  const meanReversion = ((currentPrice - avg) / avg) * 100;

  // Volatility: std deviation of returns
  const returns = [];
  for (let i = 1; i < points.length; i++) {
    returns.push((points[i] - points[i - 1]) / points[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100;

  // Simple trend detection
  let trend = "neutral";
  if (momentum > 1.5) trend = "bullish";
  else if (momentum < -1.5) trend = "bearish";

  // Short-term momentum (last 3 points)
  const shortLookback = Math.min(points.length, 3);
  const shortMomentum = ((currentPrice - points[points.length - shortLookback]) / points[points.length - shortLookback]) * 100;

  return { momentum, shortMomentum, meanReversion, volatility, trend, avg, dataPoints: points.length };
}

// ── On-Chain Signal Fetching ────────────────────────────────────
async function fetchOnChainSignals(program, walletPubkey) {
  try {
    const allSignals = await program.account.signal.all();
    // Filter to our agent's signals
    const mySignals = allSignals.filter(s => s.account.agent.equals(walletPubkey));
    return mySignals;
  } catch (e) {
    log(`  ⚠️ Could not fetch on-chain signals: ${e.message}`);
    return [];
  }
}

// ── Confidence Calibration ──────────────────────────────────────
function calibrateConfidence(baseConfidence, asset, pastSignals) {
  // Filter resolved signals for this asset
  const assetSignals = pastSignals.filter(s => s.account.asset === asset && s.account.resolved);
  
  if (assetSignals.length === 0) return baseConfidence;

  const correct = assetSignals.filter(s => "correct" in s.account.outcome).length;
  const total = assetSignals.length;
  const accuracy = correct / total;

  // Adjust confidence based on past accuracy
  // If accuracy < 50%, reduce confidence significantly
  // If accuracy > 70%, boost slightly
  let adjustment = 0;
  if (accuracy < 0.3) adjustment = -25;
  else if (accuracy < 0.5) adjustment = -15;
  else if (accuracy < 0.6) adjustment = -5;
  else if (accuracy > 0.75) adjustment = +5;
  else if (accuracy > 0.85) adjustment = +10;

  const calibrated = Math.max(20, Math.min(95, baseConfidence + adjustment));
  
  if (adjustment !== 0) {
    log(`  📊 Calibration for ${asset}: ${total} past signals, ${(accuracy * 100).toFixed(0)}% accuracy → confidence ${baseConfidence} → ${calibrated} (adj ${adjustment > 0 ? '+' : ''}${adjustment})`);
  }

  return calibrated;
}

// ── Signal Generation ───────────────────────────────────────────
function generateSignals(prices, history, pastSignals) {
  const candidates = [];

  for (const [symbol, priceData] of Object.entries(prices)) {
    const ta = calculateTA(symbol, priceData.price, history);
    const price = priceData.price;

    // Skip if insufficient data — still generate with lower confidence
    const dataDiscount = ta.dataPoints < 6 ? 15 : 0;

    // Strategy 1: Momentum continuation
    if (ta.momentum > 1.2 && ta.shortMomentum > 0.3 && ta.trend === "bullish") {
      const baseConf = Math.min(80, 55 + Math.floor(ta.momentum * 2)) - dataDiscount;
      candidates.push({
        asset: symbol,
        direction: "long",
        confidence: baseConf,
        entry: price,
        target: price * (1 + Math.min(ta.momentum / 100 * 0.8, 0.03)),
        stop: price * (1 - Math.max(ta.volatility / 100 * 2, 0.02)),
        hours: 8,
        reasoning: `Momentum continuation: ${ta.momentum.toFixed(1)}% upward momentum over ${Math.min(ta.dataPoints, 12)} periods, short-term momentum ${ta.shortMomentum.toFixed(1)}%. Trend is ${ta.trend}. Volatility ${ta.volatility.toFixed(2)}%.`,
        score: ta.momentum * 2 + (ta.shortMomentum > 0 ? 10 : 0),
      });
    }

    if (ta.momentum < -1.2 && ta.shortMomentum < -0.3 && ta.trend === "bearish") {
      const baseConf = Math.min(80, 55 + Math.floor(Math.abs(ta.momentum) * 2)) - dataDiscount;
      candidates.push({
        asset: symbol,
        direction: "short",
        confidence: baseConf,
        entry: price,
        target: price * (1 - Math.min(Math.abs(ta.momentum) / 100 * 0.8, 0.03)),
        stop: price * (1 + Math.max(ta.volatility / 100 * 2, 0.02)),
        hours: 8,
        reasoning: `Momentum continuation (bearish): ${ta.momentum.toFixed(1)}% downward momentum. Short-term momentum ${ta.shortMomentum.toFixed(1)}%. Volatility ${ta.volatility.toFixed(2)}%.`,
        score: Math.abs(ta.momentum) * 2 + (ta.shortMomentum < 0 ? 10 : 0),
      });
    }

    // Strategy 2: Mean reversion
    if (ta.meanReversion > 2 && ta.volatility > 0.3) {
      const baseConf = Math.min(70, 45 + Math.floor(ta.meanReversion)) - dataDiscount;
      candidates.push({
        asset: symbol,
        direction: "short",
        confidence: baseConf,
        entry: price,
        target: ta.avg || price * 0.97,
        stop: price * (1 + Math.max(ta.volatility / 100 * 2.5, 0.03)),
        hours: 8,
        reasoning: `Mean reversion: Price ${ta.meanReversion.toFixed(1)}% above rolling avg ($${(ta.avg || 0).toFixed(4)}). Expecting pullback. Volatility ${ta.volatility.toFixed(2)}%.`,
        score: ta.meanReversion * 1.5,
      });
    }

    if (ta.meanReversion < -2 && ta.volatility > 0.3) {
      const baseConf = Math.min(70, 45 + Math.floor(Math.abs(ta.meanReversion))) - dataDiscount;
      candidates.push({
        asset: symbol,
        direction: "long",
        confidence: baseConf,
        entry: price,
        target: ta.avg || price * 1.03,
        stop: price * (1 - Math.max(ta.volatility / 100 * 2.5, 0.03)),
        hours: 8,
        reasoning: `Mean reversion: Price ${Math.abs(ta.meanReversion).toFixed(1)}% below rolling avg ($${(ta.avg || 0).toFixed(4)}). Expecting bounce. Volatility ${ta.volatility.toFixed(2)}%.`,
        score: Math.abs(ta.meanReversion) * 1.5,
      });
    }

    // Strategy 3: Low volatility breakout expectation (longer horizon)
    if (ta.volatility < 0.3 && ta.dataPoints > 10) {
      // Neutral vol compression — predict direction based on slight momentum
      const dir = ta.momentum > 0 ? "long" : "short";
      const baseConf = 40 - dataDiscount;
      const mult = dir === "long" ? 1.04 : 0.96;
      const stopMult = dir === "long" ? 0.97 : 1.03;
      candidates.push({
        asset: symbol,
        direction: dir,
        confidence: baseConf,
        entry: price,
        target: price * mult,
        stop: price * stopMult,
        hours: 24,
        reasoning: `Volatility compression: ${ta.volatility.toFixed(3)}% vol with ${ta.dataPoints} periods of data. Expecting breakout ${dir}. Momentum bias: ${ta.momentum.toFixed(1)}%.`,
        score: 5,
      });
    }
  }

  // Sort by score, pick top 5
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, 5);

  // Apply confidence calibration based on past performance
  for (const signal of selected) {
    signal.confidence = calibrateConfidence(signal.confidence, signal.asset, pastSignals);
  }

  // If we have NO candidates at all, generate a conservative default
  if (selected.length === 0 && Object.keys(prices).length > 0) {
    // Pick the asset with best data coverage
    const bestAsset = Object.entries(prices).sort((a, b) => {
      const aPoints = (history[a[0]] || []).length;
      const bPoints = (history[b[0]] || []).length;
      return bPoints - aPoints;
    })[0];

    if (bestAsset) {
      const [symbol, data] = bestAsset;
      const ta = calculateTA(symbol, data.price, history);
      const dir = ta.momentum >= 0 ? "long" : "short";
      const conf = calibrateConfidence(35, symbol, pastSignals);
      selected.push({
        asset: symbol,
        direction: dir,
        confidence: conf,
        entry: data.price,
        target: data.price * (dir === "long" ? 1.02 : 0.98),
        stop: data.price * (dir === "long" ? 0.98 : 1.02),
        hours: 6,
        reasoning: `Low-conviction default signal. Momentum ${ta.momentum.toFixed(1)}%, direction ${dir}. Minimal edge, keeping tight stops.`,
        score: 0,
      });
    }
  }

  return selected;
}

// ── On-Chain Publishing ─────────────────────────────────────────
async function publishSignal(program, wallet, walletKeypair, signal) {
  const registryPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  )[0];

  const agentProfilePDA = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  )[0];

  // Get next signal index
  const registry = await program.account.registry.fetch(registryPDA);
  const nextIndex = registry.totalSignals.toNumber() + 1;

  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(nextIndex));

  const signalPDA = PublicKey.findProgramAddressSync(
    [Buffer.from("signal"), walletKeypair.publicKey.toBuffer(), indexBuf],
    PROGRAM_ID
  )[0];

  const direction = signal.direction === "long" ? { long: {} } : { short: {} };
  const timeHorizon = Math.floor(Date.now() / 1000) + signal.hours * 3600;
  const reasoning = signal.reasoning.slice(0, 512);

  const tx = await program.methods
    .publishSignal(
      signal.asset,
      direction,
      signal.confidence,
      new anchor.BN(Math.round(signal.entry * 1e6)),
      new anchor.BN(Math.round(signal.target * 1e6)),
      new anchor.BN(Math.round(signal.stop * 1e6)),
      new anchor.BN(timeHorizon),
      reasoning
    )
    .accounts({
      signal: signalPDA,
      agentProfile: agentProfilePDA,
      registry: registryPDA,
      agent: walletKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tx, signalPDA: signalPDA.toBase58(), expiresAt: new Date(timeHorizon * 1000).toISOString() };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════════════════════════");
  log("  🤖 SolSignal Autonomous Analyst — Agent #982 (batman)");
  log("═══════════════════════════════════════════════════════════");
  if (DRY_RUN) log("  ⚠️  DRY RUN MODE — will not publish on-chain");
  log("");

  // ── Step 1: Fetch current prices ──
  log("📡 Step 1: Fetching live prices from Pyth...");
  const prices = await fetchAllPrices();
  const priceCount = Object.keys(prices).length;
  log(`  ✅ Got prices for ${priceCount} assets`);
  for (const [symbol, data] of Object.entries(prices)) {
    log(`    ${symbol}: $${data.price.toFixed(data.price < 0.01 ? 8 : 4)} (±$${data.conf.toFixed(data.price < 0.01 ? 8 : 4)})`);
  }
  log("");

  if (priceCount === 0) {
    log("❌ No prices fetched — aborting");
    return;
  }

  // ── Step 2: Load and update price history ──
  log("📊 Step 2: Loading price history...");
  let history = loadPriceHistory();
  history = updatePriceHistory(history, prices);
  savePriceHistory(history);
  const histSummary = Object.entries(history).map(([k, v]) => `${k}:${v.length}pts`).join(", ");
  log(`  History: ${histSummary}`);
  log("");

  // ── Step 3: Setup Solana connection ──
  log("🔗 Step 3: Connecting to Solana devnet...");
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => { tx.sign(walletKeypair); return tx; },
    signAllTransactions: async (txs) => txs.map(tx => { tx.sign(walletKeypair); return tx; }),
  };
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
  const program = new anchor.Program(idl, provider);

  log(`  Wallet: ${walletKeypair.publicKey.toBase58()}`);
  log(`  RPC: ${rpcUrl}`);
  log("");

  // ── Step 4: Fetch past signals ──
  log("📜 Step 4: Fetching past on-chain signals...");
  const pastSignals = await fetchOnChainSignals(program, walletKeypair.publicKey);
  const resolved = pastSignals.filter(s => s.account.resolved);
  const correct = resolved.filter(s => "correct" in s.account.outcome).length;
  const incorrect = resolved.filter(s => "incorrect" in s.account.outcome).length;
  const pending = pastSignals.filter(s => !s.account.resolved).length;
  log(`  Total: ${pastSignals.length} | Resolved: ${resolved.length} (✅${correct} ❌${incorrect}) | Pending: ${pending}`);
  if (resolved.length > 0) {
    log(`  Overall accuracy: ${((correct / resolved.length) * 100).toFixed(1)}%`);
  }
  log("");

  // ── Step 5: Generate signals ──
  log("🧠 Step 5: Running technical analysis & signal generation...");
  const signals = generateSignals(prices, history, pastSignals);
  log(`  Generated ${signals.length} signal(s):`);
  log("");

  if (signals.length === 0) {
    log("  No actionable signals found. Market may be quiet.");
    log("  Will try again next run.");
    return;
  }

  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    log(`  ─── Signal ${i + 1} ───`);
    log(`  Asset:      ${s.asset}`);
    log(`  Direction:  ${s.direction.toUpperCase()}`);
    log(`  Confidence: ${s.confidence}%`);
    log(`  Entry:      $${s.entry.toFixed(s.entry < 0.01 ? 8 : 4)}`);
    log(`  Target:     $${s.target.toFixed(s.target < 0.01 ? 8 : 4)}`);
    log(`  Stop:       $${s.stop.toFixed(s.stop < 0.01 ? 8 : 4)}`);
    log(`  Horizon:    ${s.hours}h`);
    log(`  Reasoning:  ${s.reasoning.slice(0, 120)}...`);
    log("");
  }

  // ── Step 6: Publish on-chain ──
  if (DRY_RUN) {
    log("🏁 DRY RUN complete — skipping on-chain publish");
    log("  Run without --dry-run to publish signals on-chain");
    return;
  }

  log("🚀 Step 6: Publishing signals on-chain...");
  let published = 0;
  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    try {
      log(`  Publishing ${s.asset} ${s.direction.toUpperCase()}...`);
      const result = await publishSignal(program, wallet, walletKeypair, s);
      log(`  ✅ Published! Tx: ${result.tx}`);
      log(`     PDA: ${result.signalPDA}`);
      log(`     Expires: ${result.expiresAt}`);
      published++;
      // Delay between publishes
      if (i < signals.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      log(`  ❌ Failed to publish ${s.asset}: ${e.message}`);
      // If it's a rate limit / balance issue, stop
      if (e.message.includes("insufficient") || e.message.includes("blockhash")) {
        log("  ⚠️ Stopping further publishes due to error");
        break;
      }
    }
  }

  log("");
  log(`═══════════════════════════════════════════════════════════`);
  log(`  📊 Run Summary: ${published}/${signals.length} signals published`);
  log(`  🕐 Next run: scheduled via cron`);
  log(`═══════════════════════════════════════════════════════════`);
}

main().catch(err => {
  log(`❌ FATAL: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
