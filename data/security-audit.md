# SolSignal Security Audit Report

**Program:** SolSignal (Anchor/Solana)  
**Program ID:** `6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp`  
**Repository:** https://github.com/AnishDe12020/solsignal  
**Source:** `sol-signal/programs/sol-signal/src/lib.rs`  
**Auditor:** Automated Security Analysis  
**Date:** 2026-02-12  

---

## Executive Summary

This audit identified **2 critical**, **2 high**, and **3 medium** severity vulnerabilities in the SolSignal on-chain program. The most severe issue allows any user to resolve trading signals with arbitrary price data, enabling complete manipulation of agent reputation scores—the core trust mechanism of the protocol.

---

## Finding #1 — CRITICAL: Permissionless Signal Resolution with Arbitrary Price Data

**Severity:** Critical  
**Impact:** Complete reputation system manipulation, protocol integrity destruction  
**Location:** `resolve_signal` instruction, `ResolveSignal` accounts struct (lines ~130-175, ~210-220)

### Description

The `resolve_signal` instruction allows **any signer** (`resolver`) to resolve **any signal** with **any `resolution_price`** value. There is no oracle integration, no price feed verification, and no authorization check on the resolver.

```rust
#[derive(Accounts)]
pub struct ResolveSignal<'info> {
    #[account(
        mut,
        constraint = signal.agent == agent_profile.authority @ SolSignalError::Unauthorized
    )]
    pub signal: Account<'info, Signal>,
    #[account(
        mut,
        seeds = [b"agent", agent_profile.authority.as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    /// Anyone can resolve (permissionless resolution)
    pub resolver: Signer<'info>,
}
```

The comment even acknowledges this is intentionally permissionless, but this creates catastrophic attack vectors:

### Attack Scenarios

1. **Self-resolution fraud:** An agent publishes a signal, waits for `time_horizon` to pass, then resolves it themselves with a `resolution_price` that guarantees `Outcome::Correct`. They can achieve 100% accuracy (10000 bps) and maximum reputation with zero actual trading skill.

2. **Reputation destruction:** A competitor resolves another agent's signals with prices that guarantee `Outcome::Incorrect`, destroying their accuracy score and reputation.

3. **Subscriber deception:** Subscribers rely on `accuracy_bps` and `reputation_score` to choose agents. Since these metrics are completely gameable, subscribers are paying fees based on fraudulent data.

### Verification Proof

Any wallet can call `resolve_signal` with these parameters:
- `signal`: Any unresolved signal account where `time_horizon` has passed
- `agent_profile`: The corresponding agent profile (derivable from signal.agent)
- `resolution_price`: Any value that makes `resolution_price >= target_price` (for Long) or `resolution_price <= target_price` (for Short) to force a Correct outcome

No oracle, no authority check, no price verification.

### Recommended Fix

```rust
#[derive(Accounts)]
pub struct ResolveSignal<'info> {
    #[account(
        mut,
        constraint = signal.agent == agent_profile.authority @ SolSignalError::Unauthorized
    )]
    pub signal: Account<'info, Signal>,
    #[account(
        mut,
        seeds = [b"agent", agent_profile.authority.as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    /// Only the registry authority (or a designated oracle) can resolve
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        constraint = resolver.key() == registry.authority @ SolSignalError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
    pub resolver: Signer<'info>,
}
```

Alternatively, integrate a Pyth/Switchboard oracle price feed and validate `resolution_price` against it.

---

## Finding #2 — CRITICAL: Subscribe Sends SOL to Unvalidated Account

**Severity:** Critical  
**Impact:** Fund loss — subscription fees sent to arbitrary wallets  
**Location:** `subscribe` instruction, `Subscribe` accounts struct (lines ~98-130, ~190-205)

### Description

The `agent` account in the `Subscribe` struct is an unchecked `AccountInfo`:

```rust
/// CHECK: Agent wallet receiving the fee (validated by PDA seeds)
#[account(mut)]
pub agent: AccountInfo<'info>,
```

The safety comment claims "validated by PDA seeds" but this is **incorrect**. The subscription PDA uses the agent key as a seed (`seeds = [b"subscription", subscriber.key().as_ref(), agent.key().as_ref()]`), but this only makes the subscription *unique* per agent—it does **not validate that the agent has a registered `AgentProfile`**.

### Attack Scenario

1. A malicious frontend or relayer passes any arbitrary wallet as the `agent` account
2. The subscriber's SOL is transferred directly to that arbitrary wallet via `system_instruction::transfer`
3. A subscription PDA is created for a non-existent agent
4. The subscriber has paid for nothing — there are no signals from this "agent" and no recourse

### Verification

The `Subscribe` struct has no constraint linking `agent` to an existing `AgentProfile` account. Any `Pubkey` works.

### Recommended Fix

Add the `agent_profile` account to validate the agent is registered:

```rust
#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [b"subscription", subscriber.key().as_ref(), agent.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    /// Validate agent is registered by requiring their profile PDA exists
    #[account(
        seeds = [b"agent", agent.key().as_ref()],
        bump = agent_profile.bump,
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    /// CHECK: Agent wallet receiving the fee — validated via agent_profile constraint above
    #[account(mut)]
    pub agent: AccountInfo<'info>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

---

## Finding #3 — HIGH: No Subscription Renewal Mechanism (Permanent Lockout)

**Severity:** High  
**Impact:** Denial of service — subscribers permanently locked out after expiry  
**Location:** `Subscribe` accounts struct, `subscription` account uses `init`

### Description

The subscription account uses Anchor's `init` constraint, which only allows creation (not reinitialization). Once a subscription expires (`now >= expires_at`), the subscriber **cannot create a new subscription** to the same agent because the PDA already exists.

There is no `renew_subscription` or `close_subscription` instruction.

### Impact

- After 30 days, every subscriber is permanently locked out from that agent
- The only workaround would be for the subscriber to close the account externally, which requires knowledge of the account address and manual transaction construction
- This effectively breaks the subscription model after the first cycle

### Recommended Fix

Add a `renew_subscription` instruction that updates `expires_at` and transfers additional fees, or add a `close_subscription` instruction that allows subscribers to close expired subscriptions and reclaim rent.

---

## Finding #4 — HIGH: Agent Can Manipulate Own Accuracy to Defraud Subscribers

**Severity:** High  
**Impact:** Financial fraud via fake reputation  
**Location:** `resolve_signal` + `subscribe` flow

### Description

This is an economic attack combining Finding #1 with the subscription model:

1. Malicious agent registers and publishes many signals with obvious outcomes
2. After `time_horizon`, agent self-resolves all signals as Correct
3. Agent achieves artificially high `accuracy_bps` (e.g., 9500 = 95%)
4. Subscribers see high accuracy and pay subscription fees
5. Agent's actual future signals are worthless, but subscribers have already paid

The subscription fee goes directly to the agent's wallet with no escrow or refund mechanism. Combined with the 30-day lockout (Finding #3), subscribers have zero recourse.

---

## Finding #5 — MEDIUM: Subscription Fee Has No Upper Bound or Agent-Set Rate

**Severity:** Medium  
**Impact:** Potential griefing — subscription amount is caller-specified  
**Location:** `subscribe` instruction, `fee_lamports` parameter

### Description

The `fee_lamports` is passed by the subscriber (or the calling client), not set by the agent. There's no on-chain record of what the agent's subscription price should be. The only validation is `fee_lamports > 0`.

A malicious frontend could set `fee_lamports` to any amount. While the subscriber signs the transaction, confused or rushed users might approve excessive amounts.

### Recommended Fix

Add a `subscription_price` field to `AgentProfile` that agents set, and validate `fee_lamports == agent_profile.subscription_price`.

---

## Finding #6 — MEDIUM: Signal Index Race Condition Under Concurrent Load

**Severity:** Medium  
**Impact:** Failed transactions under concurrent signal publishing  
**Location:** `publish_signal`, PDA derivation using `registry.total_signals + 1`

### Description

The signal PDA is derived as:
```rust
seeds = [b"signal", agent.key().as_ref(), &(registry.total_signals + 1).to_le_bytes()]
```

Since `registry` is a mutable shared account, all `publish_signal` transactions globally will serialize on this account. Under high throughput, most transactions will fail because the `total_signals` value will have changed between simulation and execution.

### Recommended Fix

Use a per-agent signal counter (`agent_profile.total_signals`) instead of the global counter for PDA derivation.

---

## Finding #7 — MEDIUM: Weak Reasoning Hash Provides No Integrity Guarantee

**Severity:** Medium  
**Impact:** False sense of security — reasoning can be forged  
**Location:** `publish_signal`, reasoning hash computation (lines ~68-78)

### Description

The "hash" of the reasoning text is computed by simply copying the first 32 bytes and XORing the length into bytes 24-31:

```rust
let mut hash_bytes = [0u8; 32];
let reasoning_bytes = reasoning.as_bytes();
for (i, byte) in reasoning_bytes.iter().enumerate().take(32) {
    hash_bytes[i] = *byte;
}
let len_bytes = (reasoning_bytes.len() as u64).to_le_bytes();
for i in 0..8 {
    hash_bytes[24 + i] ^= len_bytes[i];
}
```

This is not a cryptographic hash. Two different reasoning strings with the same first 24 bytes and carefully chosen lengths will produce identical "hashes." The reasoning text is trivially recoverable from the hash (it's literally stored in plaintext in the first 24 bytes).

### Recommended Fix

Use `anchor_lang::solana_program::hash::hash(reasoning.as_bytes())` for SHA-256 hashing, or `anchor_lang::solana_program::keccak::hash`.

---

## Summary Table

| # | Severity | Title | Status |
|---|----------|-------|--------|
| 1 | **Critical** | Permissionless signal resolution with arbitrary price | Open |
| 2 | **Critical** | Subscribe sends SOL to unvalidated account | Open |
| 3 | **High** | No subscription renewal (permanent lockout) | Open |
| 4 | **High** | Self-resolution enables reputation fraud | Open |
| 5 | **Medium** | No upper bound on subscription fee | Open |
| 6 | **Medium** | Global signal counter causes serialization | Open |
| 7 | **Medium** | Weak reasoning "hash" is not cryptographic | Open |

---

## Proposed Fix Summary

A comprehensive fix PR should:
1. Add oracle/authority-gated resolution with price feed validation
2. Add `agent_profile` validation to `Subscribe` accounts
3. Add `renew_subscription` and `close_subscription` instructions
4. Move signal PDA derivation to per-agent counter
5. Replace custom hash with SHA-256
6. Add agent-set subscription pricing

---

*Report generated for Superteam Earn bounty submission.*
