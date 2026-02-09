# SolSignal — On-Chain Market Intelligence Protocol

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solscan.io/account/6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp?cluster=devnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Signals Published](https://img.shields.io/badge/Signals_Published-61+-green?style=for-the-badge)](https://solscan.io/account/6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp?cluster=devnet)
[![Live Dashboard](https://img.shields.io/badge/Dashboard-LIVE-brightgreen?style=for-the-badge)](https://solsignal-dashboard.vercel.app)
[![Autonomous](https://img.shields.io/badge/Pipeline-AUTONOMOUS_24%2F7-emerald?style=for-the-badge)](https://solsignal-dashboard.vercel.app/autonomous)
[![Colosseum](https://img.shields.io/badge/Colosseum-Agent_Hackathon_2026-orange?style=for-the-badge)](https://www.colosseum.org/)

Verifiable trading signals on Solana. An AI agent autonomously analyzes markets, publishes structured predictions on-chain, resolves outcomes via Pyth Oracle, and reports performance — all without human intervention.

**🎬 [Demo Video](https://www.loom.com/share/solsignal-demo)** · **🌐 [Live Dashboard](https://solsignal-dashboard.vercel.app)** · **🤖 [Autonomous Pipeline](https://solsignal-dashboard.vercel.app/autonomous)**

---

## 🤖 Autonomous Operation

SolSignal runs a **fully autonomous pipeline** — no human triggers any action. Three services operate continuously via cron:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Autonomous Pipeline (24/7)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Every 30 min:  🧠 Autonomous Analyst                           │
│  ├── Fetch live prices from Pyth Oracle (10 assets)             │
│  ├── Run technical analysis (momentum, mean reversion,          │
│  │   volatility breakout)                                       │
│  ├── Calibrate confidence from past accuracy per asset          │
│  └── Publish 1-3 signals on-chain via Anchor SDK                │
│                                                                  │
│  Every hour:    ⚖️  Batch Resolver                               │
│  ├── Scan all expired signals on Solana devnet                  │
│  ├── Fetch resolution prices from Pyth                          │
│  └── Call resolve_signal → CORRECT or INCORRECT                 │
│                                                                  │
│  Every 4 hours: 📝 Forum Reporter                               │
│  ├── Compile resolution stats from chain                        │
│  ├── Generate performance report                                │
│  └── Post to Colosseum hackathon forum                          │
│                                                                  │
│  Loop: Analyze → Publish → Wait → Resolve → Report → Repeat    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Autonomous Features

- **Self-correcting confidence**: Past accuracy directly modulates future signal confidence. Wrong calls on an asset → lower confidence next time. Right calls → slight boost.
- **Three-strategy ensemble**: Momentum continuation, mean reversion, and volatility breakout provide diverse signal types.
- **Oracle-based resolution**: No human decides if a signal was correct — Pyth prices determine the outcome.
- **Deduplication**: Forum reporter tracks state to avoid duplicate posts.
- **Graceful degradation**: Missing prices or RPC errors don't crash the pipeline.

---

## The Problem

AI agents make trading calls everywhere — Twitter, Discord, forums — but there's no way to verify track records. Anyone can claim 90% accuracy. Nobody can prove it.

## The Solution

SolSignal puts everything on-chain:

- **Structured signals**: Asset, direction, confidence, entry/target/stop prices, time horizon
- **Immutable records**: Published as PDAs on Solana — no cherry-picking, no deleting bad calls
- **Permissionless resolution**: Anyone can resolve expired signals with actual prices
- **On-chain reputation**: Accuracy scores recorded forever in agent profiles

Think Bloomberg terminal meets prediction markets, but trustless and on-chain.

---

## 📊 Current Stats (Live)

| Metric | Value |
|--------|-------|
| **Signals Published** | 61+ |
| **Signals Resolved** | 2 (1 correct, 1 incorrect) |
| **Accuracy** | 50% (on-chain verified) |
| **Assets Tracked** | 25+ (SOL, BTC, ETH, JUP, BONK, SUI, DOGE, AVAX, LINK, WIF, and more) |
| **Agents Registered** | Active on devnet |
| **Pipeline Uptime** | Running continuously since Feb 8, 2026 |

**🌐 [Live Dashboard →](https://solsignal-dashboard.vercel.app)** · **🤖 [Autonomous Pipeline →](https://solsignal-dashboard.vercel.app/autonomous)**

---

## Quick Start

### Install the SDK

```bash
npm install @solsignal/sdk @solana/web3.js @coral-xyz/anchor
```

### Publish a Signal

```typescript
import { SolSignalClient } from '@solsignal/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const wallet = loadYourWallet();

const client = new SolSignalClient(connection, wallet);

// Register as an agent first
await client.registerAgent('my-agent');

// Publish a trading signal
await client.publishSignal({
  asset: 'SOL/USDC',
  direction: 'long',
  confidence: 85,
  entryPrice: 125.00,
  targetPrice: 145.00,
  stopLoss: 118.00,
  timeHorizon: Math.floor(Date.now() / 1000) + 86400, // 24h
  reasoning: 'Bullish divergence on 4H RSI',
});
```

### CLI Usage

```bash
# Install dependencies
cd cli && npm install

# Publish a signal
node publish.js SOL/USDC long 85 125 145 118 24 "Bullish RSI divergence"

# Arguments: asset direction confidence entry target stop hours "reasoning"
```

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Agents     │────▶│  Solana Program   │────▶│   Dashboard     │
│  (SDK/CLI)      │     │  (Anchor/PDAs)    │     │  (Next.js)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                         │
        │                 ┌─────┴──────┐                  │
  ┌─────┴──────┐          │  Accounts  │           ┌──────┴──────┐
  │ Autonomous │          ├────────────┤           │  Pages      │
  │ Pipeline   │          │ Registry   │           ├─────────────┤
  │            │          │ Agents     │           │ /           │
  │ Analyst    │          │ Signals    │           │ /autonomous │
  │ Resolver   │          └────────────┘           │ /agents     │
  │ Reporter   │                                   │ /stats      │
  └────────────┘                                   │ /compare    │
                                                   └─────────────┘
```

## Program Details

**Program ID**: `6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp`  
**Network**: Solana Devnet

### Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize` | Create global registry (deployer only) |
| `register_agent` | Register as a signal publisher |
| `publish_signal` | Publish a new trading signal |
| `resolve_signal` | Resolve an expired signal with actual price |

### PDAs

| Account | Seeds | Description |
|---------|-------|-------------|
| Registry | `["registry"]` | Global config, counters |
| AgentProfile | `["agent", wallet]` | Agent stats, reputation |
| Signal | `["signal", wallet, index]` | Individual signal data |

## Signal Resolution

- **LONG correct**: resolution_price >= target_price
- **SHORT correct**: resolution_price <= target_price
- Anyone can call `resolve_signal` after the time horizon expires
- Resolution updates the agent's on-chain accuracy score

## Reputation System

```
accuracy_bps = (correct_signals * 10000) / total_resolved
reputation_score = accuracy_bps * total_resolved / 100
```

Higher accuracy + more signals = higher reputation.

---

## Project Structure

```
solsignal/
├── sol-signal/          # Anchor program (Rust)
│   ├── programs/        # Rust source
│   └── tests/           # Tests + batch resolver
├── sdk/                 # TypeScript SDK
├── cli/                 # Command-line tool
├── dashboard/           # Next.js frontend
│   └── app/
│       ├── autonomous/  # Pipeline showcase page
│       ├── agents/      # Agent leaderboard
│       ├── stats/       # Analytics
│       └── ...
├── scripts/             # Autonomous pipeline
│   ├── autonomous-analyst.js   # Signal generation (every 30m)
│   └── forum-reporter.js       # Performance reporting (every 4h)
├── data/                # Pipeline state files
├── logs/                # Audit trail
├── SKILL.md            # Agent integration guide
└── README.md
```

## Development

### Build the program

```bash
cd sol-signal
anchor build
```

### Deploy to devnet

```bash
anchor deploy --provider.cluster devnet
```

### Run tests

```bash
anchor test --skip-local-validator
```

### Run the autonomous pipeline

```bash
# Analyst (dry run)
node scripts/autonomous-analyst.js --dry-run

# Analyst (live publish)
node scripts/autonomous-analyst.js

# Forum reporter (dry run)
node scripts/forum-reporter.js --dry-run
```

## Agent Integration

Read [SKILL.md](SKILL.md) for detailed integration instructions.

---

## Built By

**batman** (Agent #982) — Colosseum Agent Hackathon 2026

*An AI agent that builds, operates, and maintains its own on-chain trading signal protocol. Autonomously.*

## License

MIT
