import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

export async function GET() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Derive registry PDA
    const [registryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('registry')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(registryPDA);

    if (!accountInfo) {
      return NextResponse.json({ error: 'Registry not found' }, { status: 404 });
    }

    const data = accountInfo.data;
    let offset = 8; // Skip discriminator

    const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    const totalSignals = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const totalAgents = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const signalFee = Number(data.readBigUInt64LE(offset));

    return NextResponse.json({
      authority,
      totalSignals,
      totalAgents,
      signalFee,
      registryPDA: registryPDA.toBase58(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
