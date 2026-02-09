import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import crypto from 'crypto';

const PROGRAM_ID = new PublicKey("6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp");
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// publish_signal discriminator from IDL
const PUBLISH_SIGNAL_DISC = Buffer.from([169, 80, 49, 93, 169, 216, 95, 190]);

function encodeString(s: string): Buffer {
  const buf = Buffer.alloc(4 + s.length);
  buf.writeUInt32LE(s.length, 0);
  Buffer.from(s, 'utf8').copy(buf, 4);
  return buf;
}

function encodeDirection(dir: string): Buffer {
  return Buffer.from([dir === 'long' ? 0 : 1]);
}

function encodeU8(n: number): Buffer {
  return Buffer.from([n]);
}

function encodeU64(n: BN): Buffer {
  return n.toArrayLike(Buffer, 'le', 8);
}

function encodeI64(n: BN): Buffer {
  return n.toArrayLike(Buffer, 'le', 8);
}

async function publishOnChain(signal: any) {
  const walletKey = process.env.ANCHOR_WALLET_KEY;
  if (!walletKey) return null;

  const secretKey = JSON.parse(walletKey);
  const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
  const connection = new Connection(RPC_URL, 'confirmed');

  const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = signal;

  // Fetch registry to get next index
  const [registryPDA] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);
  const registryInfo = await connection.getAccountInfo(registryPDA);
  if (!registryInfo) throw new Error('Registry not found');

  // Parse totalSignals from registry (skip 8 byte discriminator + 32 byte authority = offset 40, u64)
  const totalSignals = registryInfo.data.readBigUInt64LE(40);
  const nextIndex = Number(totalSignals) + 1;

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

  const timeHorizon = Math.floor(Date.now() / 1000) + (timeHorizonHours * 3600);
  const fullReasoning = agentName ? `[${agentName}] ${reasoning}`.substring(0, 512) : reasoning.substring(0, 512);

  // Build instruction data manually
  const data = Buffer.concat([
    PUBLISH_SIGNAL_DISC,
    encodeString(asset),
    encodeDirection(direction),
    encodeU8(confidence),
    encodeU64(new BN(Math.round(entryPrice * 1e6))),
    encodeU64(new BN(Math.round(targetPrice * 1e6))),
    encodeU64(new BN(Math.round(stopLoss * 1e6))),
    encodeI64(new BN(timeHorizon)),
    encodeString(fullReasoning),
  ]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: signalPDA, isSigner: false, isWritable: true },
      { pubkey: agentProfilePDA, isSigner: false, isWritable: true },
      { pubkey: registryPDA, isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = keypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(keypair);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');

  return { tx: sig, signalPDA: signalPDA.toBase58(), index: nextIndex };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const required = ['asset', 'direction', 'confidence', 'entryPrice', 'targetPrice', 'stopLoss', 'timeHorizonHours', 'reasoning'];
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const { asset, direction, confidence, entryPrice, targetPrice, stopLoss, timeHorizonHours, reasoning, agentName } = body;

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

    let onChainResult = null;
    try {
      onChainResult = await publishOnChain(body);
    } catch (e: any) {
      console.error("On-chain publish failed:", e.message);
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

    console.log(`[SolSignal API] ${agentName || 'anonymous'}: ${asset} ${direction} ${confidence}% → ${onChainResult ? 'ON-CHAIN ' + onChainResult.tx : 'queued'}`);

    return NextResponse.json({
      success: true,
      message: onChainResult
        ? `Signal published on-chain! TX: ${onChainResult.tx}`
        : `Signal accepted for relay`,
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
      ...(onChainResult && {
        tx: onChainResult.tx,
        signalPDA: onChainResult.signalPDA,
        index: onChainResult.index,
        verify: `https://solscan.io/tx/${onChainResult.tx}?cluster=devnet`,
      }),
      status: onChainResult ? 'published' : 'accepted',
      dashboard: 'https://solsignal-dashboard.vercel.app',
      program: '6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp',
    }, { status: onChainResult ? 200 : 202 });
  } catch (error: any) {
    console.error('[SolSignal API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
