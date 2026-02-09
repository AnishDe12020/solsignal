/**
 * Batch Resolution Script for SolSignal
 * Resolves ALL expired signals on devnet using live Pyth oracle prices
 * 
 * Agent: batman (#982) — Colosseum Hackathon
 */

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

// ──────────────────────────────────────────────
// Pyth Feed ID mapping (USD-denominated feeds)
// From https://pyth.network/developers/price-feed-ids
// ──────────────────────────────────────────────
const PYTH_FEED_IDS = {
  'SOL':      'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC':      'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH':      'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'JUP':      '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'BONK':     '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'DOGE':     'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  'XRP':      'ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  'AVAX':     '93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'LINK':     '8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'ATOM':     'b00b60f88b03a6a625a8d1c048c3f66653edf217439cb7b1ac8c27baf3cb69f0',
  'DOT':      'ca3eed9b267293f6595a13f629f3a4f4d0d7f981b41f5e33132160982e56a8f0',
  'UNI':      '78d185a741d07edb3d5e547d4eb150369e5eed461cc8cb4e3dc52fa3ea2b2d0c',
  'NEAR':     'c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750',
  'SUI':      '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  'FET':      'b98e7ae8af2d298d2651eb21ab5b8b5738212e13efb43571f5f1a3a8c8e8e4e0',
  'APT':      '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'OP':       '385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf',
  'ARB':      '3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  'AAVE':     '2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  'MATIC':    '5de33440e36357e5ffe74a006af2b98ca2acddb06fff01ae4e16da4e6d52ebd0', // actually POL/USD
  'INJ':      '7a5bc1d2b56ad029048cd63964b3ad2776eadf812eef1c0ee978d51ab89b0f26',
  'FIL':      '150ac9b959aee0051e4091f0ef5c0ad2ccea28bfaec706de6ece4e5603ee49f2',
  'MKR':      '9375299e31c0deb9c6bc378e6329aab44cb4ec52040c1c6285c9e0298c26ef28',
  'DYDX':     '6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b',
  'GRT':      '4aaa2e0592eaaacee7e31f9f5f1b5145b736283460147aa8b71b5bfdc26a1de3',
  'TRX':      '67aed5a24fdad045cb2f0bc398c8b7fe38e110a2f3e04e5ba22da0e0acf4fadb',
  'PEPE':     'd69731a2e74ac1ce884fc3571f4f10237f9cf17d8097dd19c456ee0b5578b5e4',
  'SEI':      '53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb',
  'STX':      'ec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17',
  'RUNE':     '5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e',
  'RENDER':   'f2eee8e94ab5e48746e5baab64a2dbb7ac4aca6c13b1b62988cd56406f79283b',
  'RNDR':     'f2eee8e94ab5e48746e5baab64a2dbb7ac4aca6c13b1b62988cd56406f79283b', // same as RENDER
  'PENDLE':   '9a4df90b25497f66b1afb012467e316e801ca3d839456db028892fe8c70c8016',
  'RAY':      '91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a',
  'TIA':      '09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723',
  'WIF':      '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54c2c1ea214',
  'AXL':      '60144b1d5c9e9851732ad1d9760e3485ef80be39b984f6bf60f82b28a2b7f126',
  'CRV':      'a19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8',
  'OCEAN':    '2baf8e54a37f8b44c73e28e6f468c4b016714e1cbbeab4d2d8f5bb01783bfe4a',
  'PYTH':     '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
  'FARTCOIN': '58cd29ef0e714c5affc44f269b2c1899a52da4169d7acc147b9da692e6953608',
};

/**
 * Fetch price from Pyth Hermes for a given base asset (priced in USD)
 */
async function fetchPythPriceUSD(base) {
  const feedId = PYTH_FEED_IDS[base];
  if (!feedId) return null;

  try {
    const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&parsed=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.parsed && data.parsed[0]) {
      const p = data.parsed[0].price;
      return parseFloat(p.price) * Math.pow(10, p.expo);
    }
  } catch (e) {
    console.error(`  ⚠️ Pyth fetch error for ${base}: ${e.message}`);
  }
  return null;
}

/**
 * Parse "BASE/QUOTE" asset string and return a USDC-equivalent price.
 * - If quote is USDC or USD: just return the base price in USD.
 * - If quote is SOL: price_in_usd = base_usd / sol_usd (gives base/sol ratio)
 *   BUT our on-chain prices are stored in USDC (6 decimals), so for X/SOL pairs
 *   we need to convert.
 */
async function getResolvedPrice(asset) {
  const parts = asset.split('/');
  if (parts.length !== 2) return null;
  const [base, quote] = parts;

  if (quote === 'USDC' || quote === 'USD') {
    return await fetchPythPriceUSD(base);
  }

  if (quote === 'SOL') {
    // For X/SOL pairs, we need X_usd / SOL_usd to get the ratio
    // But signal prices are stored as the ratio * 1e6 on-chain
    const basePrice = await fetchPythPriceUSD(base);
    const solPrice = await fetchPythPriceUSD('SOL');
    if (basePrice && solPrice) {
      return basePrice / solPrice; // X per SOL
    }
    return null;
  }

  // Generic: try base/quote conversion
  const basePrice = await fetchPythPriceUSD(base);
  const quotePrice = await fetchPythPriceUSD(quote);
  if (basePrice && quotePrice) {
    return basePrice / quotePrice;
  }
  return null;
}

async function main() {
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolSignal;

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   SolSignal Batch Resolution — Agent #982   ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🌐 Network: devnet`);
  console.log(`👤 Resolver: ${provider.wallet.publicKey.toBase58()}\n`);

  // Fetch all signals
  const signals = await program.account.signal.all();
  const now = Math.floor(Date.now() / 1000);

  console.log(`📊 Total signals on-chain: ${signals.length}\n`);

  // Categorize
  const alreadyResolved = [];
  const notExpired = [];
  const expiredPending = [];

  for (const s of signals) {
    const sig = s.account;
    if (sig.resolved || !('pending' in sig.outcome)) {
      alreadyResolved.push(s);
    } else if (now < sig.timeHorizon.toNumber()) {
      notExpired.push(s);
    } else {
      expiredPending.push(s);
    }
  }

  console.log(`  ✅ Already resolved: ${alreadyResolved.length}`);
  console.log(`  ⏳ Not yet expired:  ${notExpired.length}`);
  console.log(`  🔄 Expired & pending (to resolve): ${expiredPending.length}\n`);

  if (expiredPending.length === 0) {
    console.log("Nothing to resolve right now.");
    // Still show stats
    await printStats(program, provider, alreadyResolved);
    return;
  }

  // Resolve each expired signal
  console.log("═══════════════════════════════════════════════");
  console.log("  RESOLVING EXPIRED SIGNALS");
  console.log("═══════════════════════════════════════════════\n");

  let resolved = 0;
  let correct = 0;
  let incorrect = 0;
  let failed = 0;

  for (const s of expiredPending) {
    const sig = s.account;
    const direction = 'long' in sig.direction ? 'LONG 📈' : 'SHORT 📉';
    const entryPrice = sig.entryPrice.toNumber() / 1e6;
    const targetPrice = sig.targetPrice.toNumber() / 1e6;
    const stopLoss = sig.stopLoss.toNumber() / 1e6;
    const expiredAt = new Date(sig.timeHorizon.toNumber() * 1000);

    console.log(`🔄 ${sig.asset} ${direction}`);
    console.log(`   Entry: $${entryPrice.toFixed(6)} | Target: $${targetPrice.toFixed(6)} | Stop: $${stopLoss.toFixed(6)}`);
    console.log(`   Confidence: ${sig.confidence}% | Expired: ${expiredAt.toISOString()}`);

    // Fetch current price
    const price = await getResolvedPrice(sig.asset);
    if (!price) {
      console.log(`   ⚠️ Could not fetch Pyth price — skipping\n`);
      failed++;
      continue;
    }

    console.log(`   📊 Current Pyth price: $${price.toFixed(6)}`);

    // Determine expected outcome before submitting
    const isLong = 'long' in sig.direction;
    const priceU64 = Math.round(price * 1e6);
    const wouldBeCorrect = isLong 
      ? priceU64 >= sig.targetPrice.toNumber()
      : priceU64 <= sig.targetPrice.toNumber();

    // Derive agent profile PDA
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), sig.agent.toBuffer()],
      program.programId
    );

    try {
      const tx = await program.methods
        .resolveSignal(new anchor.BN(priceU64))
        .accounts({
          signal: s.publicKey,
          agentProfile: agentProfilePDA,
          resolver: provider.wallet.publicKey,
        })
        .rpc();

      resolved++;
      if (wouldBeCorrect) {
        correct++;
        console.log(`   ✅ CORRECT — Tx: ${tx.slice(0, 20)}...`);
      } else {
        incorrect++;
        console.log(`   ❌ INCORRECT — Tx: ${tx.slice(0, 20)}...`);
      }
      console.log();

      // Small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      failed++;
      const msg = e.message || e.toString();
      console.log(`   💥 TX Failed: ${msg.slice(0, 120)}\n`);
    }
  }

  // ─── Summary ───
  console.log("\n═══════════════════════════════════════════════");
  console.log("  BATCH RESOLUTION RESULTS");
  console.log("═══════════════════════════════════════════════\n");
  console.log(`  Signals resolved this run:   ${resolved}`);
  console.log(`    ✅ Correct:                ${correct}`);
  console.log(`    ❌ Incorrect:              ${incorrect}`);
  console.log(`  ⚠️ Failed/skipped:           ${failed}`);
  if (resolved > 0) {
    console.log(`  📊 Batch accuracy:           ${((correct / resolved) * 100).toFixed(1)}%`);
  }

  // Print overall stats
  await printStats(program, provider, [...alreadyResolved, ...expiredPending]);
}

async function printStats(program, provider, resolvedSignals) {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  ON-CHAIN AGENT PROFILE");
  console.log("═══════════════════════════════════════════════\n");

  try {
    const [agentProfilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const profile = await program.account.agentProfile.fetch(agentProfilePDA);
    console.log(`  Agent:           ${profile.name}`);
    console.log(`  Total Signals:   ${profile.totalSignals}`);
    console.log(`  Correct:         ${profile.correctSignals}`);
    console.log(`  Incorrect:       ${profile.incorrectSignals}`);
    console.log(`  Expired:         ${profile.expiredSignals}`);
    const accuracy = profile.accuracyBps / 100;
    console.log(`  Accuracy:        ${accuracy.toFixed(2)}%`);
    console.log(`  Reputation:      ${profile.reputationScore.toString()}`);
  } catch (e) {
    console.log(`  (Could not fetch agent profile: ${e.message})`);
  }

  // Also show per-signal breakdown if we have resolved signals
  const resolvedOnes = resolvedSignals.filter(s => s.account.resolved);
  if (resolvedOnes.length > 0) {
    console.log("\n  ── Resolved Signals Breakdown ──");
    let c = 0, ic = 0;
    for (const s of resolvedOnes) {
      const sig = s.account;
      const outcome = 'correct' in sig.outcome ? '✅' : 'incorrect' in sig.outcome ? '❌' : '⏱️';
      if ('correct' in sig.outcome) c++;
      if ('incorrect' in sig.outcome) ic++;
      const dir = 'long' in sig.direction ? 'L' : 'S';
      console.log(`  ${outcome} ${sig.asset.padEnd(14)} ${dir} | entry=$${(sig.entryPrice.toNumber()/1e6).toFixed(2)} target=$${(sig.targetPrice.toNumber()/1e6).toFixed(2)} resolved=$${(sig.resolutionPrice.toNumber()/1e6).toFixed(2)}`);
    }
    console.log(`\n  Total: ${c} correct, ${ic} incorrect out of ${resolvedOnes.length} resolved`);
    if (c + ic > 0) {
      console.log(`  Overall accuracy: ${((c / (c + ic)) * 100).toFixed(1)}%`);
    }
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
