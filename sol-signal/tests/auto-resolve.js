/**
 * Auto-resolution script for SolSignal
 * Checks for expired signals and resolves them with Pyth prices
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

const PYTH_FEEDS = {
  'SOL/USDC': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC/USDC': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USDC': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'JUP/USDC': '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'BONK/USDC': '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
};

async function fetchPythPrice(asset) {
  const feedId = PYTH_FEEDS[asset];
  if (!feedId) return null;
  
  try {
    const url = `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${feedId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data[0]) {
      return parseFloat(data[0].price.price) * Math.pow(10, data[0].price.expo);
    }
  } catch (e) {
    console.error(`Failed to fetch price for ${asset}:`, e.message);
  }
  return null;
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolSignal;

  console.log("=== SolSignal Auto-Resolution ===\n");
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Fetch all signals
  const signals = await program.account.signal.all();
  const now = Math.floor(Date.now() / 1000);

  let resolved = 0;
  let pending = 0;
  let notExpired = 0;

  for (const s of signals) {
    const signal = s.account;
    const expiresAt = signal.timeHorizon.toNumber();
    const isExpired = now >= expiresAt;
    const isPending = 'pending' in signal.outcome;

    if (!isPending) {
      resolved++;
      continue;
    }

    if (!isExpired) {
      notExpired++;
      const timeLeft = expiresAt - now;
      const hours = Math.floor(timeLeft / 3600);
      const mins = Math.floor((timeLeft % 3600) / 60);
      console.log(`⏳ ${signal.asset}: ${hours}h ${mins}m remaining`);
      continue;
    }

    // Signal is expired and pending - resolve it
    console.log(`🔄 Resolving ${signal.asset}...`);
    
    const price = await fetchPythPrice(signal.asset);
    if (!price) {
      console.log(`  ⚠️ Could not fetch price, skipping`);
      continue;
    }

    console.log(`  Current price: $${price.toFixed(6)}`);
    console.log(`  Target: $${signal.targetPrice.toNumber() / 1e6}`);
    console.log(`  Direction: ${'long' in signal.direction ? 'LONG' : 'SHORT'}`);

    // Derive agent profile PDA
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), signal.agent.toBuffer()],
      program.programId
    );

    try {
      const tx = await program.methods
        .resolveSignal(new anchor.BN(Math.round(price * 1e6)))
        .accounts({
          signal: s.publicKey,
          agentProfile: agentProfilePDA,
          resolver: provider.wallet.publicKey,
        })
        .rpc();

      console.log(`  ✅ Resolved! Tx: ${tx.slice(0, 20)}...`);
      
      // Fetch updated signal to show result
      const updated = await program.account.signal.fetch(s.publicKey);
      const outcome = 'correct' in updated.outcome ? 'CORRECT ✅' :
                      'incorrect' in updated.outcome ? 'INCORRECT ❌' : 'EXPIRED';
      console.log(`  Outcome: ${outcome}\n`);
      resolved++;
    } catch (e) {
      console.log(`  ❌ Failed: ${e.message}\n`);
    }
  }

  console.log("=== Summary ===");
  console.log(`Resolved: ${resolved}`);
  console.log(`Not yet expired: ${notExpired}`);
  console.log(`Pending (need price feed): ${pending}`);

  // Show updated agent profile
  const [agentProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );
  
  const profile = await program.account.agentProfile.fetch(agentProfilePDA);
  console.log("\n=== Updated Agent Profile ===");
  console.log(`Name: ${profile.name}`);
  console.log(`Total Signals: ${profile.totalSignals}`);
  console.log(`Correct: ${profile.correctSignals}`);
  console.log(`Incorrect: ${profile.incorrectSignals}`);
  console.log(`Accuracy: ${(profile.accuracyBps / 100).toFixed(2)}%`);
  console.log(`Reputation: ${profile.reputationScore.toString()}`);
}

main().catch(console.error);
