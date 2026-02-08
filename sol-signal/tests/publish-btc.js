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

  // 48 hours from now
  const timeHorizon = Math.floor(Date.now() / 1000) + 172800;

  const tx = await program.methods
    .publishSignal(
      "BTC/USDC",
      { short: {} },
      70, // confidence
      new anchor.BN(97500 * 1e6), // entry $97,500
      new anchor.BN(92000 * 1e6), // target $92,000
      new anchor.BN(99500 * 1e6), // stop $99,500
      new anchor.BN(timeHorizon),
      "BTC showing weakness at resistance. Lower highs on 4H, RSI bearish divergence. Expecting pullback to $92k support within 48h."
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
