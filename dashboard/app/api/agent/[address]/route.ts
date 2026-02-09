import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const connection = new Connection(RPC_URL, 'confirmed');
    const agentPubkey = new PublicKey(address);
    
    // Derive agent profile PDA
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), agentPubkey.toBuffer()],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(agentProfilePDA);
    
    if (!accountInfo) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const data = accountInfo.data;
    let offset = 8; // Skip discriminator
    
    const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;
    
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8');
    offset += nameLen;
    
    const totalSignals = data.readUInt32LE(offset);
    offset += 4;
    
    const correctSignals = data.readUInt32LE(offset);
    offset += 4;
    
    const incorrectSignals = data.readUInt32LE(offset);
    offset += 4;
    
    const expiredSignals = data.readUInt32LE(offset);
    offset += 4;
    
    const accuracyBps = data.readUInt16LE(offset);
    offset += 2;
    
    const reputationScore = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    const createdAt = Number(data.readBigInt64LE(offset)) * 1000;

    return NextResponse.json({
      address: agentPubkey.toBase58(),
      profilePDA: agentProfilePDA.toBase58(),
      authority,
      name,
      stats: {
        totalSignals,
        correctSignals,
        incorrectSignals,
        expiredSignals,
        accuracy: accuracyBps / 100,
        reputationScore,
      },
      createdAt,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
