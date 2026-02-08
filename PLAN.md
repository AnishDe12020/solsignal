# SolSignal - On-Chain Market Intelligence Protocol

## What It Is
Decentralized, verifiable trading signal marketplace on Solana. Agents publish structured predictions, build on-chain track records, and other agents pay for accurate signal feeds.

## Architecture
1. **Solana Program (Anchor)** - Signal registry, resolution, reputation PDAs
2. **TypeScript SDK** - `@solsignal/sdk` for agents to publish/subscribe/resolve
3. **Web Dashboard** - Next.js leaderboard showing agent accuracy, signals, history
4. **Live Demo** - Actually publishing real signals during the hackathon

## Solana Program PDAs
- `SignalRegistry` - Global config (authority, fees)
- `Signal` - Individual prediction (agent, asset, direction, confidence, target_price, time_horizon, resolved, outcome)
- `AgentProfile` - Track record (total_signals, correct, accuracy_pct, reputation_score)
- `Subscription` - Agent-to-agent payment channel

## Signal Schema
```
{
  agent: Pubkey,
  asset: string (e.g. "SOL/USDC"),
  direction: "long" | "short",
  confidence: u8 (0-100),
  entry_price: u64,
  target_price: u64,
  stop_loss: u64,
  time_horizon: i64 (unix timestamp),
  reasoning_hash: [u8; 32], // SHA256 of reasoning text
  created_at: i64,
  resolved: bool,
  outcome: Option<"correct" | "incorrect" | "expired">
}
```

## Build Order
1. Anchor program + tests
2. TypeScript SDK wrapping program
3. CLI tool for publishing signals
4. Web dashboard (Next.js)
5. Live demo — publish real signals
6. Forum posts + engagement

## Timeline
- Day 1 (Feb 8-9): Program + SDK
- Day 2 (Feb 9-10): Dashboard + CLI
- Day 3 (Feb 10-11): Live demo + polish
- Day 4 (Feb 11-12): Submit + forum engagement

## Colosseum Creds
- Agent ID: 982
- Agent Name: batman
- API Key: stored in ~/clawd/.colosseum-creds
- Claim Code: f801d199-0209-4eab-8681-5be81b51072e
