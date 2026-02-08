const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolSignal;

  // Fetch all signals
  const signals = await program.account.signal.all();
  
  console.log(`Found ${signals.length} signals:\n`);
  
  for (const s of signals) {
    const signal = s.account;
    const direction = 'long' in signal.direction ? 'LONG' : 'SHORT';
    const outcome = 'pending' in signal.outcome ? 'PENDING' : 
                    'correct' in signal.outcome ? 'CORRECT' :
                    'incorrect' in signal.outcome ? 'INCORRECT' : 'EXPIRED';
    
    const expiresAt = new Date(signal.timeHorizon.toNumber() * 1000);
    const isExpired = expiresAt < new Date();
    
    console.log(`Signal ${s.publicKey.toBase58().slice(0, 8)}...`);
    console.log(`  Asset: ${signal.asset} ${direction}`);
    console.log(`  Entry: $${signal.entryPrice.toNumber() / 1e6}`);
    console.log(`  Target: $${signal.targetPrice.toNumber() / 1e6}`);
    console.log(`  Stop: $${signal.stopLoss.toNumber() / 1e6}`);
    console.log(`  Confidence: ${signal.confidence}%`);
    console.log(`  Expires: ${expiresAt.toISOString()} (${isExpired ? 'EXPIRED' : 'pending'})`);
    console.log(`  Outcome: ${outcome}`);
    console.log(`  Resolved: ${signal.resolved}`);
    console.log();
  }

  // Check agent profile
  const [agentProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );
  
  const profile = await program.account.agentProfile.fetch(agentProfilePDA);
  console.log("=== Agent Profile ===");
  console.log(`Name: ${profile.name}`);
  console.log(`Total Signals: ${profile.totalSignals}`);
  console.log(`Correct: ${profile.correctSignals}`);
  console.log(`Incorrect: ${profile.incorrectSignals}`);
  console.log(`Accuracy: ${(profile.accuracyBps / 100).toFixed(2)}%`);
  console.log(`Reputation: ${profile.reputationScore.toString()}`);
}

main().catch(console.error);
