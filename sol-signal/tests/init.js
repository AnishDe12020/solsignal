const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

describe("sol-signal init", () => {
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

  it("Initializes the registry", async () => {
    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          registry: registryPDA,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Registry initialized:", tx);
    } catch (e) {
      if (e.message.includes("already in use")) {
        console.log("Registry already initialized");
      } else {
        throw e;
      }
    }

    const registry = await program.account.registry.fetch(registryPDA);
    console.log("Registry:", {
      authority: registry.authority.toBase58(),
      totalSignals: registry.totalSignals.toString(),
      totalAgents: registry.totalAgents.toString(),
    });
  });

  it("Registers batman agent", async () => {
    try {
      const tx = await program.methods
        .registerAgent("batman")
        .accounts({
          agentProfile: agentProfilePDA,
          registry: registryPDA,
          agent: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Agent registered:", tx);
    } catch (e) {
      if (e.message.includes("already in use")) {
        console.log("Agent already registered");
      } else {
        throw e;
      }
    }

    const profile = await program.account.agentProfile.fetch(agentProfilePDA);
    console.log("Agent Profile:", {
      name: profile.name,
      totalSignals: profile.totalSignals,
      accuracyBps: profile.accuracyBps,
    });
  });
});
