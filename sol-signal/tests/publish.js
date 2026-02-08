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

  // Get current signal count to derive next PDA
  const registry = await program.account.registry.fetch(registryPDA);
  const nextIndex = registry.totalSignals.toNumber() + 1;
  
  const indexBuf = Buffer.alloc(8);
  indexBuf.writeBigUInt64LE(BigInt(nextIndex));
  
  const [signalPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("signal"), provider.wallet.publicKey.toBuffer(), indexBuf],
    program.programId
  );

  console.log("Publishing signal #" + nextIndex + "...");
  console.log("Signal PDA:", signalPDA.toBase58());

  // 24 hours from now
  const timeHorizon = Math.floor(Date.now() / 1000) + 86400;

  const tx = await program.methods
    .publishSignal(
      "SOL/USDC",
      { long: {} },
      85, // confidence
      new anchor.BN(125 * 1e6), // entry $125
      new anchor.BN(145 * 1e6), // target $145
      new anchor.BN(118 * 1e6), // stop $118
      new anchor.BN(timeHorizon),
      "Bullish structure on daily. RSI divergence, volume accumulation at support. Expecting continuation to $145 within 24h."
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

  // Verify
  const signal = await program.account.signal.fetch(signalPDA);
  console.log("\n=== Published Signal ===");
  console.log("Asset:", signal.asset);
  console.log("Direction:", Object.keys(signal.direction)[0]);
  console.log("Confidence:", signal.confidence + "%");
  console.log("Entry:", signal.entryPrice.toNumber() / 1e6);
  console.log("Target:", signal.targetPrice.toNumber() / 1e6);
  console.log("Stop Loss:", signal.stopLoss.toNumber() / 1e6);
  console.log("Expires:", new Date(signal.timeHorizon.toNumber() * 1000).toISOString());
  console.log("Resolved:", signal.resolved);
}

main().catch(console.error);
