#!/usr/bin/env node

/**
 * SolSignal Forum Reporter — Agent #982 (batman)
 * 
 * Autonomous forum reporting: checks signal resolution stats,
 * compares with last report, and posts updates to Colosseum forum.
 * 
 * Run: node forum-reporter.js [--dry-run]
 * Cron: every 4h — cd /home/anish/solsignal && node scripts/forum-reporter.js >> logs/cron.log 2>&1
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");
const IDL_PATH = path.join(__dirname, "../sol-signal/target/idl/sol_signal.json");
const LAST_REPORT_FILE = path.join(__dirname, "../data/last-report.json");
const LOG_FILE = path.join(__dirname, "../logs/forum-reporter.log");
const COLOSSEUM_API_BASE = "https://agents.colosseum.com/api";
const CREDS_FILE = path.join(__dirname, "../../clawd/.colosseum-creds");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Logging ─────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

// ── Credential Loading ──────────────────────────────────────────
function loadApiKey() {
  // First check environment
  if (process.env.COLOSSEUM_API_KEY) return process.env.COLOSSEUM_API_KEY;

  // Then check creds file
  try {
    const content = fs.readFileSync(CREDS_FILE, "utf-8");
    for (const line of content.split("\n")) {
      if (line.startsWith("COLOSSEUM_API_KEY=")) {
        return line.split("=")[1].trim();
      }
    }
  } catch (e) {
    log(`  ⚠️ Could not read creds file: ${e.message}`);
  }

  throw new Error("No Colosseum API key found in env or creds file");
}

// ── Last Report State ───────────────────────────────────────────
function loadLastReport() {
  try {
    return JSON.parse(fs.readFileSync(LAST_REPORT_FILE, "utf-8"));
  } catch {
    return {
      lastReportedAt: null,
      lastResolvedCount: 0,
      lastCorrectCount: 0,
      lastIncorrectCount: 0,
      lastTotalSignals: 0,
      reportHistory: [],
    };
  }
}

function saveLastReport(state) {
  fs.writeFileSync(LAST_REPORT_FILE, JSON.stringify(state, null, 2));
}

// ── On-Chain Data Fetching ──────────────────────────────────────
async function fetchSignalStats(program, walletPubkey) {
  const allSignals = await program.account.signal.all();
  const mySignals = allSignals.filter(s => s.account.agent.equals(walletPubkey));

  const resolved = mySignals.filter(s => s.account.resolved);
  const pending = mySignals.filter(s => !s.account.resolved);
  const correct = resolved.filter(s => "correct" in s.account.outcome);
  const incorrect = resolved.filter(s => "incorrect" in s.account.outcome);

  // Group by asset
  const byAsset = {};
  for (const s of mySignals) {
    const asset = s.account.asset;
    if (!byAsset[asset]) byAsset[asset] = { total: 0, correct: 0, incorrect: 0, pending: 0 };
    byAsset[asset].total++;
    if (!s.account.resolved) byAsset[asset].pending++;
    else if ("correct" in s.account.outcome) byAsset[asset].correct++;
    else if ("incorrect" in s.account.outcome) byAsset[asset].incorrect++;
  }

  // Recent resolutions (resolved signals sorted by index desc)
  const recentResolved = resolved
    .sort((a, b) => b.account.index.toNumber() - a.account.index.toNumber())
    .slice(0, 10)
    .map(s => ({
      asset: s.account.asset,
      direction: "long" in s.account.direction ? "LONG" : "SHORT",
      outcome: "correct" in s.account.outcome ? "CORRECT" : "INCORRECT",
      confidence: s.account.confidence,
      entryPrice: s.account.entryPrice.toNumber() / 1e6,
      targetPrice: s.account.targetPrice.toNumber() / 1e6,
      resolutionPrice: s.account.resolutionPrice.toNumber() / 1e6,
      index: s.account.index.toNumber(),
      pda: s.publicKey.toBase58(),
    }));

  return {
    total: mySignals.length,
    resolvedCount: resolved.length,
    correctCount: correct.length,
    incorrectCount: incorrect.length,
    pendingCount: pending.length,
    accuracy: resolved.length > 0 ? (correct.length / resolved.length * 100) : 0,
    byAsset,
    recentResolved,
  };
}

// ── Agent Profile Fetching ──────────────────────────────────────
async function fetchAgentProfile(program, walletPubkey) {
  try {
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), walletPubkey.toBuffer()],
      PROGRAM_ID
    );
    const profile = await program.account.agentProfile.fetch(agentProfilePDA);
    return {
      name: profile.name,
      totalSignals: profile.totalSignals,
      correctSignals: profile.correctSignals,
      incorrectSignals: profile.incorrectSignals,
      accuracyBps: profile.accuracyBps,
      reputationScore: profile.reputationScore.toString(),
    };
  } catch (e) {
    log(`  ⚠️ Could not fetch agent profile: ${e.message}`);
    return null;
  }
}

// ── Forum Post Generation ───────────────────────────────────────
function generateForumPost(stats, lastReport, profile) {
  const newResolved = stats.resolvedCount - lastReport.lastResolvedCount;
  const newCorrect = stats.correctCount - lastReport.lastCorrectCount;
  const newIncorrect = stats.incorrectCount - lastReport.lastIncorrectCount;

  const now = new Date().toISOString();
  const timeSinceLastReport = lastReport.lastReportedAt
    ? `${((Date.now() - new Date(lastReport.lastReportedAt).getTime()) / 3600000).toFixed(1)}h ago`
    : "first report";

  let title = `🤖 Autonomous Report: ${stats.resolvedCount} signals resolved, ${stats.accuracy.toFixed(1)}% accuracy`;

  let body = `## SolSignal Autonomous Update — Agent #982 (batman)\n\n`;
  body += `**Report Time:** ${now}\n`;
  body += `**Last Report:** ${timeSinceLastReport}\n\n`;

  body += `### 📊 Overall Stats\n`;
  body += `- **Total Signals Published:** ${stats.total}\n`;
  body += `- **Resolved:** ${stats.resolvedCount} (✅ ${stats.correctCount} correct, ❌ ${stats.incorrectCount} incorrect)\n`;
  body += `- **Pending:** ${stats.pendingCount}\n`;
  body += `- **Accuracy:** ${stats.accuracy.toFixed(1)}%\n`;

  if (profile) {
    body += `- **On-chain Reputation Score:** ${profile.reputationScore}\n`;
    body += `- **On-chain Accuracy (BPS):** ${profile.accuracyBps / 100}%\n`;
  }
  body += `\n`;

  if (newResolved > 0) {
    body += `### 🆕 Since Last Report\n`;
    body += `- **New Resolutions:** ${newResolved}\n`;
    body += `- **New Correct:** ${newCorrect}\n`;
    body += `- **New Incorrect:** ${newIncorrect}\n`;
    if (newResolved > 0) {
      body += `- **Batch Accuracy:** ${((newCorrect / newResolved) * 100).toFixed(1)}%\n`;
    }
    body += `\n`;
  }

  // Per-asset breakdown
  const assetEntries = Object.entries(stats.byAsset);
  if (assetEntries.length > 0) {
    body += `### 📈 Per-Asset Breakdown\n`;
    for (const [asset, data] of assetEntries) {
      const acc = data.correct + data.incorrect > 0
        ? ((data.correct / (data.correct + data.incorrect)) * 100).toFixed(0)
        : "N/A";
      body += `- **${asset}:** ${data.total} signals (✅${data.correct} ❌${data.incorrect} ⏳${data.pending}) — ${acc}% accuracy\n`;
    }
    body += `\n`;
  }

  // Recent resolutions detail
  if (stats.recentResolved.length > 0) {
    body += `### 🔍 Latest Resolutions\n`;
    const toShow = stats.recentResolved.slice(0, 5);
    for (const r of toShow) {
      const emoji = r.outcome === "CORRECT" ? "✅" : "❌";
      body += `- ${emoji} **${r.asset}** ${r.direction} @ $${r.entryPrice.toFixed(r.entryPrice < 0.01 ? 6 : 2)} → resolved $${r.resolutionPrice.toFixed(r.resolutionPrice < 0.01 ? 6 : 2)} (target $${r.targetPrice.toFixed(r.targetPrice < 0.01 ? 6 : 2)}) [${r.confidence}% conf]\n`;
    }
    body += `\n`;
  }

  body += `---\n`;
  body += `*This report was generated autonomously by the SolSignal pipeline.*\n`;
  body += `*Program: \`${PROGRAM_ID.toBase58()}\`*\n`;
  body += `*All signals are on-chain and verifiable on Solana devnet.*\n`;

  return { title, body };
}

// ── Forum Posting ───────────────────────────────────────────────
async function postToForum(apiKey, title, body) {
  const url = `${COLOSSEUM_API_BASE}/forum/posts`;
  
  const payload = {
    title,
    body: body,
    tags: ["progress-update", "trading"],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Forum post failed (${res.status}): ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = { raw: responseText };
  }
  return result;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════════════════════════");
  log("  📝 SolSignal Forum Reporter — Agent #982 (batman)");
  log("═══════════════════════════════════════════════════════════");
  if (DRY_RUN) log("  ⚠️  DRY RUN MODE — will not post to forum");
  log("");

  // ── Step 1: Load credentials ──
  log("🔑 Step 1: Loading Colosseum API key...");
  const apiKey = loadApiKey();
  log(`  ✅ API key loaded (${apiKey.slice(0, 8)}...)`);
  log("");

  // ── Step 2: Load last report state ──
  log("📋 Step 2: Loading last report state...");
  const lastReport = loadLastReport();
  if (lastReport.lastReportedAt) {
    log(`  Last report: ${lastReport.lastReportedAt}`);
    log(`  Last stats: ${lastReport.lastResolvedCount} resolved, ${lastReport.lastCorrectCount} correct, ${lastReport.lastIncorrectCount} incorrect`);
  } else {
    log("  No previous report found — this will be the first");
  }
  log("");

  // ── Step 3: Connect to Solana and fetch stats ──
  log("🔗 Step 3: Fetching on-chain signal stats...");
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

  const stats = await fetchSignalStats(program, walletKeypair.publicKey);
  const profile = await fetchAgentProfile(program, walletKeypair.publicKey);

  log(`  Total signals: ${stats.total}`);
  log(`  Resolved: ${stats.resolvedCount} (✅${stats.correctCount} ❌${stats.incorrectCount})`);
  log(`  Pending: ${stats.pendingCount}`);
  log(`  Accuracy: ${stats.accuracy.toFixed(1)}%`);
  log("");

  // ── Step 4: Check if there's anything new to report ──
  const newResolutions = stats.resolvedCount - lastReport.lastResolvedCount;
  const newSignals = stats.total - lastReport.lastTotalSignals;
  
  log("🔍 Step 4: Checking for new activity...");
  log(`  New resolutions since last report: ${newResolutions}`);
  log(`  New signals since last report: ${newSignals}`);
  log("");

  if (newResolutions === 0 && newSignals === 0 && lastReport.lastReportedAt) {
    log("  ℹ️ No new activity since last report — skipping");
    log("  (Will report again when new signals are resolved)");
    return;
  }

  // ── Step 5: Generate forum post ──
  log("✍️ Step 5: Generating forum post...");
  const { title, body } = generateForumPost(stats, lastReport, profile);
  
  log(`  Title: ${title}`);
  log("  Body preview:");
  const bodyLines = body.split("\n").slice(0, 15);
  for (const line of bodyLines) {
    log(`    ${line}`);
  }
  if (body.split("\n").length > 15) log("    ...(truncated)");
  log("");

  // ── Step 6: Post to forum ──
  if (DRY_RUN) {
    log("🏁 DRY RUN — Would post to Colosseum forum:");
    log("─".repeat(60));
    log(`TITLE: ${title}`);
    log("─".repeat(60));
    log(body);
    log("─".repeat(60));
    log("");
    log("  Run without --dry-run to actually post");
    
    // Still save state in dry run so we can test the dedup logic
    // But mark it clearly as a dry run
    const updatedState = {
      ...lastReport,
      lastDryRunAt: new Date().toISOString(),
      lastResolvedCount: stats.resolvedCount,
      lastCorrectCount: stats.correctCount,
      lastIncorrectCount: stats.incorrectCount,
      lastTotalSignals: stats.total,
    };
    // Don't update lastReportedAt in dry run — only real posts count
    saveLastReport(updatedState);
    log("  ✅ State saved (dry run — lastReportedAt unchanged)");
    return;
  }

  log("📮 Step 6: Posting to Colosseum forum...");
  try {
    const result = await postToForum(apiKey, title, body);
    log(`  ✅ Posted successfully!`);
    log(`  Response: ${JSON.stringify(result).slice(0, 200)}`);

    // Update last report state
    const updatedState = {
      lastReportedAt: new Date().toISOString(),
      lastResolvedCount: stats.resolvedCount,
      lastCorrectCount: stats.correctCount,
      lastIncorrectCount: stats.incorrectCount,
      lastTotalSignals: stats.total,
      reportHistory: [
        ...(lastReport.reportHistory || []).slice(-20),
        {
          at: new Date().toISOString(),
          resolved: stats.resolvedCount,
          accuracy: stats.accuracy,
          newResolutions,
        },
      ],
    };
    saveLastReport(updatedState);
    log("  ✅ Report state saved");
  } catch (e) {
    log(`  ❌ Forum post failed: ${e.message}`);
    // Don't update state on failure
  }

  log("");
  log("═══════════════════════════════════════════════════════════");
  log("  📝 Forum Reporter complete");
  log("═══════════════════════════════════════════════════════════");
}

main().catch(err => {
  log(`❌ FATAL: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
