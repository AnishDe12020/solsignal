import { PublicKey } from '@solana/web3.js';

export type Direction = 'long' | 'short';
export type Outcome = 'pending' | 'correct' | 'incorrect' | 'expired';

export interface PublishSignalParams {
  asset: string;
  direction: Direction;
  confidence: number; // 0-100
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number; // Unix timestamp
  reasoning: string;
}

export interface SignalData {
  agent: PublicKey;
  index: bigint;
  asset: string;
  direction: Direction;
  confidence: number;
  entryPrice: bigint;
  targetPrice: bigint;
  stopLoss: bigint;
  timeHorizon: bigint;
  reasoningHash: Uint8Array;
  createdAt: bigint;
  resolved: boolean;
  outcome: Outcome;
  resolutionPrice: bigint;
  bump: number;
}

export interface AgentProfileData {
  authority: PublicKey;
  name: string;
  totalSignals: number;
  correctSignals: number;
  incorrectSignals: number;
  expiredSignals: number;
  accuracyBps: number;
  reputationScore: bigint;
  createdAt: bigint;
  bump: number;
}

export interface RegistryData {
  authority: PublicKey;
  totalSignals: bigint;
  totalAgents: bigint;
  signalFee: bigint;
  bump: number;
}
