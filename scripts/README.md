# SolSignal Autonomous Pipeline 🤖

**Agent #982 (batman) — Colosseum Agent Hackathon**

This directory contains the fully autonomous signal publishing and reporting pipeline for SolSignal. The system operates continuously without human intervention, demonstrating end-to-end agentic capability.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 SolSignal Autonomous Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Pyth Oracle      │    │  Solana Devnet    │                   │
│  │  (Live Prices)    │    │  (Signal Storage) │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────────────────────────────┐                   │
│  │     autonomous-analyst.js (every 30m)     │                   │
│  │                                           │                   │
│  │  1. Fetch live prices from Pyth           │                   │
│  │  2. Load & update price history           │                   │
│  │  3. Fetch past signal outcomes            │                   │
│  │  4. Run technical analysis                │                   │
│  │  5. Generate signals with calibration     │                   │
│  │  6. Publish on-chain                      │                   │
│  └──────────────────┬───────────────────────┘                   │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────┐                   │
│  │      forum-reporter.js (every 4h)         │                   │
│  │                                           │                   │
│  │  1. Fetch resolution stats from chain     │                   │
│  │  2. Compare with last report              │                   │
│  │  3. Generate performance report           │                   │
│  │  4. Post to Colosseum forum               │                   │
│  │  5. Deduplicate via state tracking        │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Scripts

### `autonomous-analyst.js`

The core signal generation engine. Runs every 30 minutes via cron.

**What it does:**
1. **Price Fetching** — Pulls live prices for 10 crypto assets from Pyth Oracle (Hermes API)
2. **Price History** — Maintains a rolling price database in `data/price-history.json`
3. **Technical Analysis** — Computes momentum, mean reversion, and volatility indicators
4. **Signal Generation** — Three strategies:
   - **Momentum Continuation** — Rides existing trends
   - **Mean Reversion** — Fades overextended moves
   - **Volatility Breakout** — Anticipates moves from compression
5. **Confidence Calibration** — Adjusts confidence based on past accuracy per asset
   - If past signals for an asset were wrong → lower confidence
   - If past signals were right → slight confidence boost
6. **On-Chain Publishing** — Publishes 1-3 signals per run via Anchor SDK
7. **Logging** — Full audit trail in `logs/autonomous-analyst.log`

**Usage:**
```bash
# Dry run (analyze but don't publish)
node scripts/autonomous-analyst.js --dry-run

# Live publish
node scripts/autonomous-analyst.js
```

### `forum-reporter.js`

Autonomous reporting to the Colosseum hackathon forum.

**What it does:**
1. **Credential Loading** — Sources Colosseum API key from `.colosseum-creds` or env
2. **Stats Fetching** — Reads all signal outcomes from Solana devnet
3. **Deduplication** — Compares current stats vs last report in `data/last-report.json`
4. **Report Generation** — Formats a detailed markdown report with:
   - Overall accuracy stats
   - Per-asset breakdown
   - Recent resolution details
   - New activity since last report
5. **Forum Posting** — POSTs to Colosseum API with proper auth
6. **State Persistence** — Saves report state to avoid duplicate posts

**Usage:**
```bash
# Dry run (show what would be posted)
node scripts/forum-reporter.js --dry-run

# Live post
node scripts/forum-reporter.js
```

## Cron Schedule

```cron
# Autonomous analyst — every 30 minutes
*/30 * * * * cd /home/anish/solsignal && node scripts/autonomous-analyst.js >> logs/cron.log 2>&1

# Forum reporter — every 4 hours
0 */4 * * * cd /home/anish/solsignal && node scripts/forum-reporter.js >> logs/cron.log 2>&1

# Batch resolver — every hour (resolves expired signals)
0 * * * * cd /home/anish/solsignal/sol-signal && ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json npx ts-mocha -t 120000 tests/batch-resolve.js >> ../logs/cron.log 2>&1
```

## Data Files

| File | Purpose |
|------|---------|
| `data/price-history.json` | Rolling price database (up to 200 points per asset) |
| `data/last-report.json` | Forum report deduplication state |
| `logs/autonomous-analyst.log` | Full analyst run logs |
| `logs/forum-reporter.log` | Forum reporter logs |
| `logs/cron.log` | Combined cron output |

## Tracked Assets

SOL, BTC, ETH, JUP, BONK, SUI, DOGE, AVAX, LINK, WIF — all priced via Pyth Oracle against USDC.

## Key Design Decisions

1. **Standalone Node.js** — No build step. Uses the cli's node_modules for Anchor/web3.js.
2. **Confidence Calibration** — Past accuracy directly modulates future confidence. Bad calls reduce confidence; good calls earn trust.
3. **Three-Strategy Ensemble** — Momentum, mean reversion, and volatility breakout provide diverse signal types.
4. **Dedup via State Files** — Forum reporter won't spam identical updates.
5. **Dry Run Mode** — Both scripts support `--dry-run` for safe testing.
6. **Graceful Degradation** — Missing price data or RPC errors don't crash the pipeline.

## Autonomy Loop

```
Every 30 min:  Analyst → fetch prices → analyze → publish signals
Every 1 hour:  Resolver → check expired signals → resolve on-chain  
Every 4 hours: Reporter → check stats → post to forum
```

This creates a fully autonomous loop: the agent publishes signals, they get resolved by price oracles, and the results are reported — all without human intervention.

---

*Built for the "Most Agentic" prize — Colosseum Agent Hackathon*
