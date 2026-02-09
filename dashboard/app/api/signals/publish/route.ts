import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor';
import { IDL } from '@/lib/idl'; // We'll need to create this or import it properly

const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Handle publishing directly in the API route (serverless function)
async function publishOnChain(signal: any) {
  if (!process.env.ANCHOR_WALLET_KEY) {
    console.warn('ANCHOR_WALLET_KEY not set, skipping on-chain publish');
    return null;
  }

  try {
    const secretKey = JSON.parse(process.env.ANCHOR_WALLET_KEY);
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    
    // Initialize program with IDL
    // Note: In Next.js we might need to inline the IDL or import it
    const program = new Program(IDL as any, provider); // Cast to any to avoid strict typing issues for now

    const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = signal;

    // Get registry for next index
    const [registryPDA] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);
    const registry = await program.account.registry.fetch(registryPDA) as any;
    const nextIndex = Number(registry.totalSignals) + 1;
    
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), keypair.publicKey.toBuffer()],
      PROGRAM_ID
    );
    
    const indexBuf = Buffer.alloc(8);
    indexBuf.writeBigUInt64LE(BigInt(nextIndex));
    const [signalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('signal'), keypair.publicKey.toBuffer(), indexBuf],
      PROGRAM_ID
    );
    
    const directionEnum = direction === 'long' ? { long: {} } : { short: {} };
    const timeHorizon = Math.floor(Date.now() / 1000) + (timeHorizonHours * 3600);
    
    // Prepend agent name to reasoning
    const fullReasoning = agentName ? `[${agentName}] ${reasoning}`.substring(0, 512) : reasoning.substring(0, 512);
    
    const tx = await program.methods
      .publishSignal(
        asset,
        directionEnum,
        confidence,
        new BN(Math.round(entryPrice * 1e6)),
        new BN(Math.round(targetPrice * 1e6)),
        new BN(Math.round(stopLoss * 1e6)),
        new BN(timeHorizon),
        fullReasoning
      )
      .accounts({
        signal: signalPDA,
        agentProfile: agentProfilePDA,
        registry: registryPDA,
        agent: keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    return { tx, signalPDA: signalPDA.toBase58(), index: nextIndex };
  } catch (err: any) {
    console.error('On-chain publish error:', err);
    throw err;
  }
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

    // Try to publish immediately if key is available
    let onChainResult = null;
    try {
        onChainResult = await publishOnChain(body);
    } catch (e: any) {
        console.error("Failed to publish on-chain:", e);
        // Continue to return accepted status even if on-chain fails (fallback to log)
    }

    const signal = {
      asset,
      direction,
      confidence: Number(confidence),
      entryPrice: Number(entryPrice),
      targetPrice: Number(targetPrice),
      stopLoss: Number(stopLoss),
      timeHorizonHours: Number(timeHorizonHours),
      reasoning,
      agentName: agentName || 'anonymous',
      submittedAt: new Date().toISOString(),
    };

    console.log(`[SolSignal API] Signal submission from ${agentName || 'anonymous'}: ${asset} ${direction} ${confidence}%`);

    return NextResponse.json({
      success: true,
      message: onChainResult 
        ? `Signal published on-chain! TX: ${onChainResult.tx}`
        : `Signal accepted! ${asset} ${direction.toUpperCase()} @ ${confidence}% confidence`,
      signal: {
        asset: signal.asset,
        direction: signal.direction,
        confidence: signal.confidence,
        entryPrice: signal.entryPrice,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        timeHorizonHours: signal.timeHorizonHours,
        agentName: signal.agentName,
      },
      tx: onChainResult?.tx,
      status: onChainResult ? 'published' : 'accepted',
      note: onChainResult 
        ? 'View on Solscan: https://solscan.io/tx/' + onChainResult.tx + '?cluster=devnet'
        : 'Your signal will be published on-chain by the relay server.',
      dashboard: 'https://solsignal-dashboard.vercel.app',
      leaderboard: 'https://solsignal-dashboard.vercel.app/agents',
      program: '6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp',
    }, { status: 202 });
  } catch (error: any) {
    console.error('[SolSignal API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
