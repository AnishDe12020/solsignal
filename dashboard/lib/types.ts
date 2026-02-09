// ── Signal types ──

export type Direction = 'long' | 'short';
export type Outcome = 'pending' | 'correct' | 'incorrect' | 'expired';

export interface Signal {
  publicKey: string;
  agent: string;
  index: number;
  asset: string;
  direction: Direction;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number;
  createdAt: number;
  resolved: boolean;
  outcome: Outcome;
}

export interface SignalDetail extends Signal {
  reasoningHash: string;
  resolutionPrice: number;
}

// ── API response wrappers ──

export interface SignalsResponse {
  signals: Signal[];
  count: number;
  timestamp: number;
}

export interface SignalDetailResponse extends SignalDetail {}

export interface PricesResponse {
  prices: Record<string, number>;
  timestamp: number;
}

// ── Agent types ──

export interface AgentProfile {
  profilePDA: string;
  authority: string;
  name: string;
  totalSignals: number;
  correctSignals: number;
  incorrectSignals: number;
  expiredSignals: number;
  accuracyBps: number;
  reputationScore: number;
  createdAt: number;
}

export interface AgentsResponse {
  agents: AgentProfile[];
  count: number;
  timestamp: number;
}

export interface AgentDetailResponse {
  address: string;
  profilePDA: string;
  authority: string;
  name: string;
  stats: {
    totalSignals: number;
    correctSignals: number;
    incorrectSignals: number;
    expiredSignals: number;
    accuracy: number;
    reputationScore: number;
  };
  createdAt: number;
}

// ── Registry types ──

export interface RegistryResponse {
  authority: string;
  totalSignals: number;
  totalAgents: number;
  signalFee: number;
  registryPDA: string;
}

// ── Error response ──

export interface ApiError {
  error: string;
}
