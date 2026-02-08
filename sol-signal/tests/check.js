const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

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

  console.log("=== Registry ===");
  const registry = await program.account.registry.fetch(registryPDA);
  console.log("Authority:", registry.authority.toBase58());
  console.log("Total Signals:", registry.totalSignals.toString());
  console.log("Total Agents:", registry.totalAgents.toString());

  console.log("\n=== Batman Agent ===");
  const profile = await program.account.agentProfile.fetch(agentProfilePDA);
  console.log("Name:", profile.name);
  console.log("Authority:", profile.authority.toBase58());
  console.log("Total Signals:", profile.totalSignals);
  console.log("Accuracy (bps):", profile.accuracyBps);
  console.log("Created At:", new Date(profile.createdAt.toNumber() * 1000).toISOString());
}

main().catch(console.error);
