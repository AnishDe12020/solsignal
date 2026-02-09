import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

function parseAgentProfile(pubkey: PublicKey, data: Buffer) {
  try {
    let offset = 8; // Skip discriminator

    const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    if (nameLen > 32) return null; // Sanity check
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

    return {
      profilePDA: pubkey.toBase58(),
      authority,
      name,
      totalSignals,
      correctSignals,
      incorrectSignals,
      expiredSignals,
      accuracyBps,
      reputationScore,
      createdAt,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Agent profile accounts are ~80-111 bytes (varies by name length)
    // Signal accounts are 220 bytes, Registry is ~57 bytes
    // Fetch all program accounts and filter out signals by size
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);

    const agents = accounts
      .filter(a => a.account.data.length !== 220 && a.account.data.length < 120 && a.account.data.length > 70)
      .map(a => parseAgentProfile(a.pubkey, a.account.data))
      .filter(Boolean);

    // Sort by reputation score descending
    agents.sort((a: any, b: any) => b.reputationScore - a.reputationScore);

    return NextResponse.json({
      agents,
      count: agents.length,
      timestamp: Date.now(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
