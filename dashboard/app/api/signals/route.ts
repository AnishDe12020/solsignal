import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Fetch all program accounts that could be signals
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 220 }, // Signal accounts are ~220 bytes
      ],
    });

    const signals = accounts.map((account) => {
      try {
        const data = account.account.data;
        // Skip discriminator (8 bytes)
        let offset = 8;
        
        const agent = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;
        
        const index = data.readBigUInt64LE(offset);
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
        
        // Skip reasoning hash (32 bytes)
        offset += 32;
        
        const createdAt = Number(data.readBigInt64LE(offset)) * 1000;
        offset += 8;
        
        const resolved = data[offset] === 1;
        offset += 1;
        
        const outcomeByte = data[offset];
        const outcome = outcomeByte === 0 ? 'pending' : 
                       outcomeByte === 1 ? 'correct' :
                       outcomeByte === 2 ? 'incorrect' : 'expired';

        return {
          publicKey: account.pubkey.toBase58(),
          agent,
          index: Number(index),
          asset,
          direction,
          confidence,
          entryPrice,
          targetPrice,
          stopLoss,
          timeHorizon,
          createdAt,
          resolved,
          outcome,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Sort by createdAt descending
    signals.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return NextResponse.json({
      signals,
      count: signals.length,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
