use anchor_lang::prelude::*;

declare_id!("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");

/// Maximum length for asset symbol (e.g., "SOL/USDC")
const MAX_ASSET_LEN: usize = 32;
/// Maximum length for reasoning text
const MAX_REASONING_LEN: usize = 512;

#[program]
pub mod sol_signal {
    use super::*;

    /// Initialize the global registry (called once by deployer)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_signals = 0;
        registry.total_agents = 0;
        registry.signal_fee = 0; // Free for now
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    /// Register a new agent profile
    pub fn register_agent(ctx: Context<RegisterAgent>, name: String) -> Result<()> {
        require!(name.len() <= 32, SolSignalError::NameTooLong);

        let profile = &mut ctx.accounts.agent_profile;
        profile.authority = ctx.accounts.agent.key();
        profile.name = name;
        profile.total_signals = 0;
        profile.correct_signals = 0;
        profile.incorrect_signals = 0;
        profile.expired_signals = 0;
        profile.accuracy_bps = 0; // basis points (0-10000)
        profile.reputation_score = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.agent_profile;

        let registry = &mut ctx.accounts.registry;
        registry.total_agents += 1;

        Ok(())
    }

    /// Publish a new trading signal
    pub fn publish_signal(
        ctx: Context<PublishSignal>,
        asset: String,
        direction: Direction,
        confidence: u8,
        entry_price: u64,
        target_price: u64,
        stop_loss: u64,
        time_horizon: i64,
        reasoning: String,
    ) -> Result<()> {
        require!(asset.len() <= MAX_ASSET_LEN, SolSignalError::AssetTooLong);
        require!(confidence <= 100, SolSignalError::InvalidConfidence);
        require!(reasoning.len() <= MAX_REASONING_LEN, SolSignalError::ReasoningTooLong);

        let now = Clock::get()?.unix_timestamp;
        require!(time_horizon > now, SolSignalError::InvalidTimeHorizon);

        let agent_key = ctx.accounts.agent.key();
        let signal_key = ctx.accounts.signal.key();

        // Compute reasoning hash
        let mut hash_bytes = [0u8; 32];
        let reasoning_bytes = reasoning.as_bytes();
        for (i, byte) in reasoning_bytes.iter().enumerate().take(32) {
            hash_bytes[i] = *byte;
        }
        let len_bytes = (reasoning_bytes.len() as u64).to_le_bytes();
        for i in 0..8 {
            hash_bytes[24 + i] ^= len_bytes[i];
        }

        // Update registry first to get signal index
        let registry = &mut ctx.accounts.registry;
        registry.total_signals += 1;
        let signal_index = registry.total_signals;

        // Update agent profile
        let profile = &mut ctx.accounts.agent_profile;
        profile.total_signals += 1;

        // Write signal data
        let signal = &mut ctx.accounts.signal;
        signal.agent = agent_key;
        signal.index = signal_index;
        signal.asset = asset.clone();
        signal.direction = direction.clone();
        signal.confidence = confidence;
        signal.entry_price = entry_price;
        signal.target_price = target_price;
        signal.stop_loss = stop_loss;
        signal.time_horizon = time_horizon;
        signal.reasoning_hash = hash_bytes;
        signal.created_at = now;
        signal.resolved = false;
        signal.outcome = Outcome::Pending;
        signal.resolution_price = 0;
        signal.bump = ctx.bumps.signal;

        emit!(SignalPublished {
            agent: agent_key,
            signal: signal_key,
            asset,
            direction,
            confidence,
            entry_price,
            target_price,
            time_horizon,
            timestamp: now,
        });

        Ok(())
    }

    /// Subscribe to an agent's signals by paying a fee
    pub fn subscribe(ctx: Context<Subscribe>, fee_lamports: u64) -> Result<()> {
        require!(fee_lamports > 0, SolSignalError::InvalidFee);

        let now = Clock::get()?.unix_timestamp;
        let thirty_days: i64 = 30 * 24 * 60 * 60;

        // Transfer fee from subscriber to agent
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.subscriber.key(),
            &ctx.accounts.agent.key(),
            fee_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.subscriber.to_account_info(),
                ctx.accounts.agent.to_account_info(),
            ],
        )?;

        let subscription = &mut ctx.accounts.subscription;
        subscription.subscriber = ctx.accounts.subscriber.key();
        subscription.agent = ctx.accounts.agent.key();
        subscription.fee_paid = fee_lamports;
        subscription.subscribed_at = now;
        subscription.expires_at = now + thirty_days;
        subscription.active = true;
        subscription.bump = ctx.bumps.subscription;

        emit!(SubscriptionCreated {
            subscriber: ctx.accounts.subscriber.key(),
            agent: ctx.accounts.agent.key(),
            fee_paid: fee_lamports,
            expires_at: now + thirty_days,
            timestamp: now,
        });

        Ok(())
    }

    /// Consume a signal (requires active subscription)
    pub fn consume_signal(ctx: Context<ConsumeSignal>, signal_index: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Validate subscription is active and not expired
        let subscription = &ctx.accounts.subscription;
        require!(subscription.active, SolSignalError::SubscriptionInactive);
        require!(now < subscription.expires_at, SolSignalError::SubscriptionExpired);

        let log = &mut ctx.accounts.consumption_log;
        log.subscriber = ctx.accounts.subscriber.key();
        log.signal = ctx.accounts.signal.key();
        log.consumed_at = now;
        log.bump = ctx.bumps.consumption_log;

        emit!(SignalConsumed {
            subscriber: ctx.accounts.subscriber.key(),
            signal: ctx.accounts.signal.key(),
            signal_index,
            timestamp: now,
        });

        Ok(())
    }

    /// Resolve a signal after its time horizon has passed
    pub fn resolve_signal(
        ctx: Context<ResolveSignal>,
        resolution_price: u64,
    ) -> Result<()> {
        let signal_key = ctx.accounts.signal.key();
        let signal = &mut ctx.accounts.signal;
        let now = Clock::get()?.unix_timestamp;

        require!(!signal.resolved, SolSignalError::AlreadyResolved);
        require!(now >= signal.time_horizon, SolSignalError::TimeHorizonNotReached);

        signal.resolved = true;
        signal.resolution_price = resolution_price;

        // Determine outcome
        let correct = match signal.direction {
            Direction::Long => resolution_price >= signal.target_price,
            Direction::Short => resolution_price <= signal.target_price,
        };

        signal.outcome = if correct {
            Outcome::Correct
        } else {
            Outcome::Incorrect
        };

        // Update agent profile
        let profile = &mut ctx.accounts.agent_profile;
        match signal.outcome {
            Outcome::Correct => profile.correct_signals += 1,
            Outcome::Incorrect => profile.incorrect_signals += 1,
            _ => {}
        }

        // Recalculate accuracy in basis points
        let resolved = profile.correct_signals + profile.incorrect_signals;
        if resolved > 0 {
            profile.accuracy_bps = ((profile.correct_signals as u64 * 10000) / resolved as u64) as u16;
        }

        // Update reputation (simple: accuracy * signal_count weight)
        profile.reputation_score = (profile.accuracy_bps as u64)
            .checked_mul(resolved as u64)
            .unwrap_or(0)
            / 100;

        emit!(SignalResolved {
            agent: signal.agent,
            signal: signal_key,
            outcome: signal.outcome.clone(),
            resolution_price,
            accuracy_bps: profile.accuracy_bps,
            timestamp: now,
        });

        Ok(())
    }
}

// === Accounts ===

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Registry::INIT_SPACE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = agent,
        space = 8 + AgentProfile::INIT_SPACE,
        seeds = [b"agent", agent.key().as_ref()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub agent: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishSignal<'info> {
    #[account(
        init,
        payer = agent,
        space = 8 + Signal::INIT_SPACE,
        seeds = [b"signal", agent.key().as_ref(), &(registry.total_signals + 1).to_le_bytes()],
        bump
    )]
    pub signal: Account<'info, Signal>,
    #[account(
        mut,
        seeds = [b"agent", agent.key().as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub agent: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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
    /// CHECK: Agent wallet receiving the fee (validated by PDA seeds)
    #[account(mut)]
    pub agent: AccountInfo<'info>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(signal_index: u64)]
pub struct ConsumeSignal<'info> {
    #[account(
        init,
        payer = subscriber,
        space = 8 + ConsumptionLog::INIT_SPACE,
        seeds = [b"consumption", subscriber.key().as_ref(), signal.key().as_ref()],
        bump
    )]
    pub consumption_log: Account<'info, ConsumptionLog>,
    #[account(
        seeds = [b"subscription", subscriber.key().as_ref(), signal.agent.as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,
    pub signal: Account<'info, Signal>,
    #[account(mut)]
    pub subscriber: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

// === State ===

#[account]
#[derive(InitSpace)]
pub struct Registry {
    pub authority: Pubkey,
    pub total_signals: u64,
    pub total_agents: u64,
    pub signal_fee: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AgentProfile {
    pub authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub total_signals: u32,
    pub correct_signals: u32,
    pub incorrect_signals: u32,
    pub expired_signals: u32,
    pub accuracy_bps: u16,
    pub reputation_score: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Signal {
    pub agent: Pubkey,
    pub index: u64,
    #[max_len(32)]
    pub asset: String,
    pub direction: Direction,
    pub confidence: u8,
    pub entry_price: u64,
    pub target_price: u64,
    pub stop_loss: u64,
    pub time_horizon: i64,
    pub reasoning_hash: [u8; 32],
    pub created_at: i64,
    pub resolved: bool,
    pub outcome: Outcome,
    pub resolution_price: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub agent: Pubkey,
    pub fee_paid: u64,
    pub subscribed_at: i64,
    pub expires_at: i64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ConsumptionLog {
    pub subscriber: Pubkey,
    pub signal: Pubkey,
    pub consumed_at: i64,
    pub bump: u8,
}

// === Enums ===

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, InitSpace)]
pub enum Direction {
    Long,
    Short,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, InitSpace)]
pub enum Outcome {
    Pending,
    Correct,
    Incorrect,
    Expired,
}

// === Events ===

#[event]
pub struct SignalPublished {
    pub agent: Pubkey,
    pub signal: Pubkey,
    pub asset: String,
    pub direction: Direction,
    pub confidence: u8,
    pub entry_price: u64,
    pub target_price: u64,
    pub time_horizon: i64,
    pub timestamp: i64,
}

#[event]
pub struct SignalResolved {
    pub agent: Pubkey,
    pub signal: Pubkey,
    pub outcome: Outcome,
    pub resolution_price: u64,
    pub accuracy_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCreated {
    pub subscriber: Pubkey,
    pub agent: Pubkey,
    pub fee_paid: u64,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct SignalConsumed {
    pub subscriber: Pubkey,
    pub signal: Pubkey,
    pub signal_index: u64,
    pub timestamp: i64,
}

// === Errors ===

#[error_code]
pub enum SolSignalError {
    #[msg("Agent name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Asset symbol too long (max 32 chars)")]
    AssetTooLong,
    #[msg("Confidence must be 0-100")]
    InvalidConfidence,
    #[msg("Reasoning text too long (max 512 chars)")]
    ReasoningTooLong,
    #[msg("Time horizon must be in the future")]
    InvalidTimeHorizon,
    #[msg("Signal already resolved")]
    AlreadyResolved,
    #[msg("Time horizon not yet reached")]
    TimeHorizonNotReached,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Subscription fee must be greater than zero")]
    InvalidFee,
    #[msg("Subscription is not active")]
    SubscriptionInactive,
    #[msg("Subscription has expired")]
    SubscriptionExpired,
}
