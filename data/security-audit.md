# Security Audit Report: Squads Protocol v4 & Phoenix DEX

**Programs Audited:**
1. **Squads Protocol v4** — Multisig program (`Squads-Protocol/v4`, commit latest main)
2. **Phoenix DEX v1** — Order book DEX (`Ellipsis-Labs/phoenix-v1`, commit latest main)

**Auditor:** Automated Security Analysis (Claude)
**Date:** 2026-02-12
**Report For:** Superteam Earn — "Audit & Fix Open-Source Solana Repositories for Vulnerabilities"

---

## Executive Summary

This audit focused on two high-profile production Solana programs managing significant TVL. The primary finding is a **HIGH severity access control flaw** in Squads Protocol v4's spending limit mechanism, where removed multisig members retain the ability to drain vault funds via pre-existing spending limits — directly contradicting the program's documented security guarantees. Additional findings include a reentrancy surface in vault transaction execution and several medium-severity design concerns.

---

## Squads Protocol v4 Findings

### Finding #1 — HIGH: Removed Multisig Members Can Still Drain Funds Via Spending Limits

**Severity:** High
**Impact:** Unauthorized fund withdrawal by removed members
**Location:** `programs/squads_multisig_program/src/instructions/spending_limit_use.rs` (line 101)
**Program ID:** `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`

#### Description

The `spending_limit_use` instruction validates the caller against `spending_limit.members` but **never checks `multisig.is_member()`**. This means a key that was added to a spending limit and later removed from the multisig can still execute spending limit transfers without restriction.

The program's own documentation explicitly states the opposite behavior:

```rust
// From state/spending_limit.rs:
/// Members of the multisig that can use the spending limit.
/// In case a member is removed from the multisig, the spending limit will remain existent
/// (until explicitly deleted), but the removed member will not be able to use it anymore.
pub members: Vec<Pubkey>,
```

But the actual validation code is:

```rust
// From instructions/spending_limit_use.rs:
fn validate(&self) -> Result<()> {
    // member
    require!(
        spending_limit.members.contains(&member.key()),  // ← Only checks spending_limit.members
        MultisigError::Unauthorized
    );
    // ... no multisig.is_member() check anywhere
}
```

#### Complicating Factor

The `MultisigAddSpendingLimitArgs` struct explicitly documents that spending limit members "Don't have to be members of the multisig" — which means this was a deliberate design choice to allow external keys. However, this creates a dangerous contradiction with the `SpendingLimit` struct documentation that claims removed members lose access.

For multisigs that set spending limit members = multisig members (the common case), the documented security guarantee is **false**. An admin removing a compromised key from the multisig would believe that key has lost all access, when in reality it can still drain funds up to the spending limit amount.

#### Attack Scenario

1. Multisig has members [A, B, C] with threshold 2/3
2. A spending limit is created with `members: [A, B, C]`, amount: 100 SOL/day, destinations: [] (any)
3. Member C's key is compromised
4. Members A & B vote to remove C from the multisig via config transaction
5. A & B believe C is fully locked out (the code comments confirm this belief)
6. **C can still call `spending_limit_use` and drain 100 SOL/day** because:
   - `spending_limit.members` still contains C
   - No `multisig.is_member()` check exists
   - The spending limit was not explicitly deleted (requires a separate config transaction)

#### Verification

Examine `spending_limit_use.rs` validate function — search for `is_member` — it does not appear. The only authorization check is `spending_limit.members.contains()`.

#### Recommended Fix

Add a multisig membership check to `spending_limit_use`:

```rust
fn validate(&self) -> Result<()> {
    let Self {
        multisig,
        member,
        spending_limit,
        mint,
        ..
    } = self;

    // member must be in the spending limit's member list
    require!(
        spending_limit.members.contains(&member.key()),
        MultisigError::Unauthorized
    );

    // SECURITY FIX: member must also still be a member of the multisig
    // (unless the spending limit is intentionally configured for external keys)
    require!(
        multisig.is_member(member.key()).is_some(),
        MultisigError::NotAMember
    );

    // ... rest of validation
}
```

**Note:** If the design intent is to allow non-multisig-member spending limits, the documentation must be corrected, and a separate flag should indicate whether multisig membership is required.

---

### Finding #2 — MEDIUM: Vault Transaction Execution Missing Multisig Account Protection

**Severity:** Medium
**Impact:** Potential state manipulation via self-CPI reentrancy
**Location:** `programs/squads_multisig_program/src/instructions/vault_transaction_execute.rs` (line ~96)

#### Description

During vault transaction execution, the `protected_accounts` list only includes `proposal.key()`:

```rust
let protected_accounts = &[proposal.key()];
```

The `multisig` account is NOT protected. This means a crafted vault transaction could include a CPI call back into the squads program that writes to the multisig account.

In contrast, `batch_execute_transaction.rs` properly protects both `proposal` and `batch`:

```rust
let protected_accounts = &[proposal.key(), batch_key];
```

#### Impact Assessment

Solana's runtime prevents cross-program writes to accounts not owned by the calling program, which significantly limits exploitation. However, a vault transaction that CPIs back into the squads program itself could modify multisig state (e.g., changing threshold, adding members) mid-execution. The multisig account's PDA seeds would still need to match, and the vault would need to be the signer, but this creates a non-trivial attack surface for sophisticated exploits.

#### Recommended Fix

```rust
let protected_accounts = &[proposal.key(), multisig.key()];
```

---

### Finding #3 — MEDIUM: Stale Approved Vault Transactions Remain Executable Indefinitely

**Severity:** Medium
**Impact:** Outdated transactions can be executed after membership/threshold changes
**Location:** `programs/squads_multisig_program/src/instructions/vault_transaction_execute.rs` (line ~60)

#### Description

The code explicitly documents and allows stale vault transactions to be executed if they were approved before becoming stale:

```rust
// Stale vault transaction proposals CAN be executed if they were approved
// before becoming stale, hence no check for staleness here.
```

This is by design but creates a risk: if a multisig's membership or threshold changes (which increments `stale_transaction_index`), previously approved vault transactions remain executable. A member who was removed might have previously approved a malicious transaction that is now executed by any remaining executor.

The inconsistency is that `config_transaction_execute` DOES check for staleness:

```rust
// Stale config transaction proposals CANNOT be executed even if approved.
require!(
    proposal.transaction_index > multisig.stale_transaction_index,
    MultisigError::StaleProposal
);
```

Vault transactions should arguably follow the same pattern.

---

### Finding #4 — LOW: SpendingLimit Period Reset Allows Extra Spending After Long Inactivity

**Severity:** Low
**Impact:** Spending limit reset logic may allow double the intended amount in edge cases
**Location:** `programs/squads_multisig_program/src/instructions/spending_limit_use.rs` (lines ~118-130)

#### Description

The spending limit reset logic jumps `last_reset` forward by `periods_passed * reset_period`:

```rust
if passed_since_last_reset > reset_period {
    spending_limit.remaining_amount = spending_limit.amount;
    let periods_passed = passed_since_last_reset.checked_div(reset_period).unwrap();
    spending_limit.last_reset = spending_limit
        .last_reset
        .checked_add(periods_passed.checked_mul(reset_period).unwrap())
        .unwrap();
}
```

If a spending limit with a daily period hasn't been used for 3 days, `remaining_amount` resets to `amount` on the first use. The user can then spend the full `amount`, wait for the next period boundary (which could be minutes away due to the reset calculation), and spend again. This means the effective spending rate immediately after a dormant period can be 2x the intended rate within a short window.

This is by design (not accumulating unused periods) but may surprise users expecting strict per-period limits.

---

## Phoenix DEX v1 Findings

### Finding #5 — LOW: No Input Validation on MultipleOrderPacket Vector Sizes

**Severity:** Low
**Impact:** Potential compute unit exhaustion / transaction failure
**Location:** `src/program/processor/new_order.rs` (process_multiple_new_orders)

#### Description

The `MultipleOrderPacket` struct's `bids` and `asks` vectors have no enforced maximum length. A user could submit a packet with thousands of orders, causing the transaction to run out of compute units. The `itertools::sorted_by` and `group_by` operations on large vectors compound this.

While this would only cause the submitter's own transaction to fail (no fund loss), it creates unnecessary compute waste and could be used for minor griefing if combined with priority fee manipulation.

---

### Finding #6 — INFO: Authority Transfer Is Two-Step (Positive Finding)

Phoenix implements a secure two-step authority transfer pattern (`name_successor` → `claim_authority`), preventing accidental authority loss from typos. The market status transition system is also well-designed with proper state machine validation.

---

## Summary Table

| # | Program | Severity | Title |
|---|---------|----------|-------|
| 1 | Squads v4 | **High** | Removed multisig members can drain funds via spending limits |
| 2 | Squads v4 | **Medium** | Vault tx execution missing multisig account protection |
| 3 | Squads v4 | **Medium** | Stale approved vault transactions executable indefinitely |
| 4 | Squads v4 | **Low** | Spending limit period reset allows burst spending |
| 5 | Phoenix v1 | **Low** | No max size on multiple order packet vectors |
| 6 | Phoenix v1 | **Info** | Good: Two-step authority transfer pattern |

---

## Methodology

- Manual source code review of on-chain Rust programs
- Focus areas: access control, authorization checks, fund flow, reentrancy, state consistency
- Cross-referenced documentation/comments against actual code behavior
- Analyzed all state mutation paths for invariant violations

## Repositories

- **Squads v4:** https://github.com/Squads-Protocol/v4
- **Phoenix v1:** https://github.com/Ellipsis-Labs/phoenix-v1

---

*Report generated for Superteam Earn bounty submission — February 2026*
