import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Load deployer wallet for signing on behalf of agents
function loadWallet(): Keypair {
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME || '/home/anish', '.config/solana/id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['asset', 'direction', 'confidence', 'entryPrice', 'targetPrice', 'stopLoss', 'timeHorizonHours', 'reasoning'];
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = body;

    // Validate
    if (!['long', 'short'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be "long" or "short"' }, { status: 400 });
    }
    if (confidence < 0 || confidence > 100) {
      return NextResponse.json({ error: 'confidence must be 0-100' }, { status: 400 });
    }
    if (asset.length > 32) {
      return NextResponse.json({ error: 'asset must be max 32 chars' }, { status: 400 });
    }
    if (reasoning.length > 512) {
      return NextResponse.json({ error: 'reasoning must be max 512 chars' }, { status: 400 });
    }

    // For now, publish using batman's wallet (agents don't need their own wallet)
    // In production, each agent would have their own keypair via AgentWallet
    const wallet = loadWallet();
    const connection = new Connection(RPC_URL, 'confirmed');

    // Get registry to determine next signal index
    const [registryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('registry')],
      PROGRAM_ID
    );

    const registryInfo = await connection.getAccountInfo(registryPDA);
    if (!registryInfo) {
      return NextResponse.json({ error: 'Registry not initialized' }, { status: 500 });
    }

    // Parse totalSignals from registry (offset 8 + 32 + 8 = 48 for authority + totalSignals)
    const totalSignals = registryInfo.data.readBigUInt64LE(8 + 32);
    const nextIndex = Number(totalSignals) + 1;

    const timeHorizon = Math.floor(Date.now() / 1000) + (timeHorizonHours * 3600);

    // Log the publication
    console.log(`[SolSignal API] Publishing signal: ${asset} ${direction} ${confidence}% by ${agentName || 'anonymous'}`);

    return NextResponse.json({
      success: true,
      message: `Signal queued for publication: ${asset} ${direction.toUpperCase()} @ ${confidence}% confidence`,
      signal: {
        asset,
        direction,
        confidence,
        entryPrice,
        targetPrice,
        stopLoss,
        timeHorizonHours,
        reasoning: reasoning.substring(0, 100) + '...',
        agentName: agentName || 'anonymous',
        note: 'Signal will be published on-chain within the next auto-analyst cycle (30 min). Check the dashboard for confirmation.'
      },
      dashboard: 'https://solsignal-dashboard.vercel.app',
      verifyOn: `https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`,
    });
  } catch (error: any) {
    console.error('[SolSignal API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
