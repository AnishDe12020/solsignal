import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';

export const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
export const RPC_URL = 'https://api.devnet.solana.com';

// Minimal IDL for reading
const IDL = {
  version: '0.1.0',
  name: 'sol_signal',
  instructions: [],
  accounts: [
    { name: 'registry', discriminator: [] },
    { name: 'agentProfile', discriminator: [] },
    { name: 'signal', discriminator: [] },
  ],
  types: [],
  address: PROGRAM_ID.toBase58(),
};

export interface SignalAccount {
  agent: PublicKey;
  index: BN;
  asset: string;
  direction: { long: {} } | { short: {} };
  confidence: number;
  entryPrice: BN;
  targetPrice: BN;
  stopLoss: BN;
  timeHorizon: BN;
  reasoningHash: number[];
  createdAt: BN;
  resolved: boolean;
  outcome: { pending: {} } | { correct: {} } | { incorrect: {} } | { expired: {} };
  resolutionPrice: BN;
  bump: number;
}

export interface AgentAccount {
  authority: PublicKey;
  name: string;
  totalSignals: number;
  correctSignals: number;
  incorrectSignals: number;
  expiredSignals: number;
  accuracyBps: number;
  reputationScore: BN;
  createdAt: BN;
  bump: number;
}

export interface RegistryAccount {
  authority: PublicKey;
  totalSignals: BN;
  totalAgents: BN;
  signalFee: BN;
  bump: number;
}

export function getDirection(d: SignalAccount['direction']): 'long' | 'short' {
  return 'long' in d ? 'long' : 'short';
}

export function getOutcome(o: SignalAccount['outcome']): 'pending' | 'correct' | 'incorrect' | 'expired' {
  if ('pending' in o) return 'pending';
  if ('correct' in o) return 'correct';
  if ('incorrect' in o) return 'incorrect';
  return 'expired';
}

export function priceFromBN(bn: BN): number {
  return bn.toNumber() / 1e6;
}

export async function fetchSignals(connection: Connection): Promise<{ pubkey: PublicKey; account: SignalAccount }[]> {
  // Fetch all accounts owned by the program with the signal discriminator
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: 220 }, // Approximate signal account size
    ],
  });

  // Parse accounts - this is simplified, real implementation would use proper IDL parsing
  return accounts.map((a) => ({
    pubkey: a.pubkey,
    account: parseSignalAccount(a.account.data),
  })).filter(a => a.account !== null) as { pubkey: PublicKey; account: SignalAccount }[];
}

function parseSignalAccount(data: Buffer): SignalAccount | null {
  try {
    // Skip 8 byte discriminator
    let offset = 8;
    
    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    const index = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    // String (4 byte length + chars)
    const assetLen = data.readUInt32LE(offset);
    offset += 4;
    const asset = data.slice(offset, offset + assetLen).toString('utf8');
    offset += assetLen;
    
    // Direction enum (1 byte)
    const dirByte = data[offset];
    offset += 1;
    const direction = dirByte === 0 ? { long: {} } : { short: {} };
    
    const confidence = data[offset];
    offset += 1;
    
    const entryPrice = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const targetPrice = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const stopLoss = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const timeHorizon = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const reasoningHash = Array.from(data.slice(offset, offset + 32));
    offset += 32;
    
    const createdAt = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const resolved = data[offset] === 1;
    offset += 1;
    
    const outcomeByte = data[offset];
    offset += 1;
    const outcome = outcomeByte === 0 ? { pending: {} } : 
                    outcomeByte === 1 ? { correct: {} } :
                    outcomeByte === 2 ? { incorrect: {} } : { expired: {} };
    
    const resolutionPrice = new BN(data.slice(offset, offset + 8), 'le');
    offset += 8;
    
    const bump = data[offset];
    
    return {
      agent,
      index,
      asset,
      direction,
      confidence,
      entryPrice,
      targetPrice,
      stopLoss,
      timeHorizon,
      reasoningHash,
      createdAt,
      resolved,
      outcome,
      resolutionPrice,
      bump,
    };
  } catch (e) {
    return null;
  }
}
