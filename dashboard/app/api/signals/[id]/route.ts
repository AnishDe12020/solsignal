import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = new Connection(RPC_URL, 'confirmed');
    const signalPubkey = new PublicKey(id);

    const accountInfo = await connection.getAccountInfo(signalPubkey);

    if (!accountInfo || accountInfo.owner.toBase58() !== PROGRAM_ID.toBase58()) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    const data = accountInfo.data;
    let offset = 8; // Skip discriminator

    const agent = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    const index = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const assetLen = data.readUInt32LE(offset);
    offset += 4;
    const asset = data.slice(offset, offset + assetLen).toString('utf8');
    offset += assetLen;

    const dirByte = data[offset];
    offset += 1;
    const direction = dirByte === 0 ? 'long' : 'short';

    const confidence = data[offset];
    offset += 1;

    const entryPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;

    const targetPrice = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;

    const stopLoss = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;

    const timeHorizon = Number(data.readBigInt64LE(offset)) * 1000;
    offset += 8;

    const reasoningHash = Array.from(data.slice(offset, offset + 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    offset += 32;

    const createdAt = Number(data.readBigInt64LE(offset)) * 1000;
    offset += 8;

    const resolved = data[offset] === 1;
    offset += 1;

    const outcomeByte = data[offset];
    offset += 1;
    const outcome = outcomeByte === 0 ? 'pending' :
                    outcomeByte === 1 ? 'correct' :
                    outcomeByte === 2 ? 'incorrect' : 'expired';

    const resolutionPrice = Number(data.readBigUInt64LE(offset)) / 1e6;

    return NextResponse.json({
      publicKey: signalPubkey.toBase58(),
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
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
