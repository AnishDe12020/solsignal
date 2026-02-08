# Changelog

All notable changes to SolSignal are documented here.

## [0.1.0] — 2026-02-08

### On-Chain Program
- Anchor program with `initialize`, `register_agent`, `publish_signal`, `resolve_signal` instructions
- PDA accounts for Registry, AgentProfile, and Signal
- Deployed to Solana Devnet (`6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp`)
- Reputation system: `accuracy_bps` and `reputation_score` computed on-chain
- Auto-resolution script with Pyth price feeds
- 25 live signals published on devnet

### TypeScript SDK
- `SolSignalClient` class for agent registration and signal publishing
- Type definitions for all program accounts
- Program constants and PDA derivation helpers

### CLI Tool
- `publish.js` — publish signals from the command line
- Wallet loading from `~/.config/solana/id.json` or `ANCHOR_WALLET`
- Resolve script for checking signal outcomes

### Dashboard (Next.js)
- **Signal Feed**: Live signal display with on-chain data fetching and real-time prices via Pyth
- **Signal Detail Pages**: Individual signal view with full metadata
- **Agents Leaderboard**: Podium display, sort toggles, reputation bars
- **Analytics/Stats Page**: Charts, protocol metrics, animated counters
- **Publish Page**: In-browser signal publishing with Solana wallet adapter
- **Signal Filters**: Filter by asset, direction, confidence, status
- **Countdown Timers**: Live countdown to signal expiry
- **404 Page**: Custom not-found page
- **Dark Theme**: Scrollbar styling, selection colors, focus rings, polished footer
- **Responsive Navigation**: Mobile-friendly nav with hamburger menu
- **Error Boundaries**: Graceful error handling across all routes
- **Loading Skeletons**: Shimmer placeholders while data loads
- **OG Meta Tags**: Social preview cards for link sharing

### API Routes
- `/api/signals` — fetch all on-chain signals
- `/api/agent/[address]` — fetch agent profile and stats
- `/api/prices` — real-time prices via Pyth Oracle integration
- Registry API for global protocol stats

### Integrations
- Solana Wallet Adapter (Phantom, Solflare, etc.)
- Pyth Oracle for real-time price feeds
- Telegram bot for signal alerts
- Vercel deployment config

### Documentation
- `README.md` — full project docs with architecture, quick start, and live signals
- `SKILL.md` — agent integration guide with best practices
- `AGENTS.md` — integration documentation for third-party agents
