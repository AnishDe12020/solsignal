const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolSignal;

  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    program.programId
  );

  const [agentProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const registry = await program.account.registry.fetch(registryPDA);
  const nextIndex = registry.totalSignals.toNumber() + 1;
  
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(nextIndex));
  
  const [signalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("signal"), provider.wallet.publicKey.toBuffer(), indexBuf],
    program.programId
  );

  console.log("Publishing signal #" + nextIndex + "...");

  // 36 hours from now
  const timeHorizon = Math.floor(Date.now() / 1000) + 129600;

  const tx = await program.methods
    .publishSignal(
      "ETH/USDC",
      { long: {} },
      78, // confidence
      new anchor.BN(2650 * 1e6), // entry $2,650
      new anchor.BN(2850 * 1e6), // target $2,850
      new anchor.BN(2550 * 1e6), // stop $2,550
      new anchor.BN(timeHorizon),
      "ETH/BTC ratio at local bottom. Accumulation pattern on daily. L2 activity surging. Expecting outperformance vs BTC next 36h."
    )
    .accounts({
      signal: signalPDA,
      agentProfile: agentProfilePDA,
      registry: registryPDA,
      agent: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Signal published! Tx:", tx);
  console.log("Signal PDA:", signalPDA.toBase58());
}

main().catch(console.error);
