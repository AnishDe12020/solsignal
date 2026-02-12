#!/usr/bin/env node
/**
 * SolSignal - Solana Narrative Detection & Idea Generation Tool
 * 
 * Detects emerging narratives by analyzing:
 * 1. Onchain: Recent program deployments, slot activity via Solana RPC
 * 2. Developer: GitHub trending Solana repos, commit velocity
 * 3. Market: Pyth price feeds for unusual activity
 * 4. Social: Aggregated signals from ecosystem sources
 * 
 * Outputs a structured narrative report with actionable build ideas.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const GITHUB_API = 'https://api.github.com';
const PYTH_API = 'https://hermes.pyth.network';

// ── Utilities ──────────────────────────────────────────────────────────────────

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'SolSignal/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
    };
    const req = mod.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function rpcCall(method, params = []) {
  return fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }).then(r => r.data?.result);
}

async function safe(fn, fallback) {
  try { return await fn(); } catch (e) { console.error(`[warn] ${e.message}`); return fallback; }
}

// ── Data Collection ────────────────────────────────────────────────────────────

async function getOnchainMetrics() {
  console.log('[1/4] Fetching onchain metrics...');
  
  const [epochInfo, perfSamples, supply, blockHeight] = await Promise.all([
    rpcCall('getEpochInfo'),
    rpcCall('getRecentPerformanceSamples', [15]),
    rpcCall('getSupply'),
    rpcCall('getBlockHeight'),
  ]);

  // Recent program activity - get largest accounts to detect new big programs
  const recentSlots = perfSamples || [];
  const avgTps = recentSlots.length > 0
    ? recentSlots.reduce((s, p) => s + p.numTransactions / p.samplePeriodSecs, 0) / recentSlots.length
    : 0;
  
  const tpsValues = recentSlots.map(p => p.numTransactions / p.samplePeriodSecs);
  const tpsMean = tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length || 0;
  const tpsStdDev = Math.sqrt(tpsValues.reduce((s, v) => s + (v - tpsMean) ** 2, 0) / tpsValues.length) || 0;
  const tpsSpike = tpsValues.length > 0 ? Math.max(...tpsValues) : 0;
  const tpsSpikeZScore = tpsStdDev > 0 ? (tpsSpike - tpsMean) / tpsStdDev : 0;

  // Get vote vs non-vote to gauge real usage
  const nonVoteTxRatio = recentSlots.length > 0
    ? recentSlots.reduce((s, p) => s + (p.numNonVoteTransactions || 0) / Math.max(p.numTransactions, 1), 0) / recentSlots.length
    : 0;

  return {
    epoch: epochInfo?.epoch,
    slotIndex: epochInfo?.slotIndex,
    slotsInEpoch: epochInfo?.slotsInEpoch,
    blockHeight,
    avgTps: Math.round(avgTps),
    tpsSpike: Math.round(tpsSpike),
    tpsSpikeZScore: Math.round(tpsSpikeZScore * 100) / 100,
    nonVoteTxRatio: Math.round(nonVoteTxRatio * 1000) / 10, // percentage
    circulatingSupply: supply?.value?.circulating,
    totalSupply: supply?.value?.total,
    signals: [],
  };
}

async function getGitHubTrending() {
  console.log('[2/4] Fetching GitHub developer activity...');
  
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const queries = [
    `solana+language:rust+created:>${oneWeekAgo}`,
    `solana+language:typescript+created:>${oneWeekAgo}`,
    `anchor+solana+created:>${oneWeekAgo}`,
    `solana+defi`,
    `solana+ai+agent`,
    `solana+blink`,
    `solana+compressed+nft`,
    `solana+token+extensions`,
    `solana+mev`,
    `solana+paymaster`,
  ];

  const results = [];
  for (const q of queries) {
    const res = await safe(
      () => fetch(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`),
      { data: { items: [] } }
    );
    const items = res.data?.items || [];
    for (const repo of items) {
      if (!results.find(r => r.full_name === repo.full_name)) {
        results.push({
          full_name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          language: repo.language,
          topics: repo.topics || [],
          open_issues: repo.open_issues_count,
          url: repo.html_url,
        });
      }
    }
    // Rate limit courtesy
    await new Promise(r => setTimeout(r, 1200));
  }

  // Sort by recency and stars
  results.sort((a, b) => {
    const aScore = a.stars + (new Date(a.created_at) > new Date(Date.now() - 7 * 86400000) ? 100 : 0);
    const bScore = b.stars + (new Date(b.created_at) > new Date(Date.now() - 7 * 86400000) ? 100 : 0);
    return bScore - aScore;
  });

  // Categorize by narrative
  const categories = {};
  for (const repo of results.slice(0, 40)) {
    const text = `${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
    let cat = 'other';
    if (text.includes('ai') || text.includes('agent') || text.includes('llm') || text.includes('gpt')) cat = 'ai-agents';
    else if (text.includes('defi') || text.includes('swap') || text.includes('amm') || text.includes('lending') || text.includes('yield')) cat = 'defi';
    else if (text.includes('nft') || text.includes('metaplex') || text.includes('compressed')) cat = 'nfts';
    else if (text.includes('blink') || text.includes('action')) cat = 'blinks-actions';
    else if (text.includes('token') && text.includes('extension')) cat = 'token-extensions';
    else if (text.includes('mev') || text.includes('jito') || text.includes('sandwich')) cat = 'mev-infrastructure';
    else if (text.includes('pay') || text.includes('commerce') || text.includes('merchant')) cat = 'payments';
    else if (text.includes('game') || text.includes('gaming')) cat = 'gaming';
    else if (text.includes('social') || text.includes('dao') || text.includes('governance')) cat = 'social-dao';
    else if (text.includes('mobile') || text.includes('saga') || text.includes('seeker')) cat = 'mobile';
    else if (text.includes('bridge') || text.includes('wormhole') || text.includes('cross-chain')) cat = 'cross-chain';
    else if (text.includes('infra') || text.includes('rpc') || text.includes('validator') || text.includes('sdk')) cat = 'infrastructure';
    
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(repo);
  }

  return { repos: results.slice(0, 40), categories, totalFound: results.length };
}

async function getPythMarketData() {
  console.log('[3/4] Fetching Pyth price feed data...');
  
  // Key Solana ecosystem price feeds
  const feedIds = {
    'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'JTO/USD': '0xb43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
    'PYTH/USD': '0x0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',
    'JUP/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
    'BONK/USD': '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
    'WIF/USD': '0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6571f0e93a2ccefab',
    'RNDR/USD': '0xab2f4c8d0e1035ad35af94ad3707caee032e4291a07d9a04b5b0ed11a50db21a',
  };

  const prices = {};
  for (const [name, id] of Object.entries(feedIds)) {
    const res = await safe(
      () => fetch(`${PYTH_API}/v2/updates/price/latest?ids[]=${id}`),
      null
    );
    if (res?.data?.parsed?.[0]) {
      const p = res.data.parsed[0].price;
      const price = Number(p.price) * 10 ** Number(p.expo);
      const conf = Number(p.conf) * 10 ** Number(p.expo);
      prices[name] = {
        price: Math.round(price * 10000) / 10000,
        confidence: Math.round(conf * 10000) / 10000,
        confidencePct: Math.round((conf / price) * 10000) / 100,
        timestamp: new Date(Number(p.publish_time) * 1000).toISOString(),
      };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Detect unusual confidence spreads (high spread = high volatility)
  const volatileAssets = Object.entries(prices)
    .filter(([, v]) => v.confidencePct > 0.5)
    .sort((a, b) => b[1].confidencePct - a[1].confidencePct);

  return { prices, volatileAssets: volatileAssets.map(([k]) => k) };
}

async function getSocialSignals() {
  console.log('[4/4] Aggregating social/ecosystem signals...');

  // Fetch recent Solana ecosystem news and social signals
  const sources = [];

  // Check Solana Labs blog / ecosystem announcements
  const solanaStatus = await safe(
    () => fetch('https://status.solana.com/api/v2/summary.json'),
    null
  );
  if (solanaStatus?.data) {
    sources.push({
      source: 'solana-status',
      status: solanaStatus.data.status?.description || 'unknown',
      incidents: (solanaStatus.data.incidents || []).slice(0, 3).map(i => ({
        name: i.name,
        impact: i.impact,
        created_at: i.created_at,
      })),
    });
  }

  // Check DeFiLlama for Solana TVL trend
  const tvlData = await safe(
    () => fetch('https://api.llama.fi/v2/historicalChainTvl/Solana'),
    null
  );
  if (tvlData?.data && Array.isArray(tvlData.data)) {
    const recent = tvlData.data.slice(-30);
    const tvlNow = recent[recent.length - 1]?.tvl || 0;
    const tvl7dAgo = recent[recent.length - 8]?.tvl || tvlNow;
    const tvl30dAgo = recent[0]?.tvl || tvlNow;
    sources.push({
      source: 'defillama',
      currentTvl: Math.round(tvlNow / 1e6), // millions
      tvl7dChange: Math.round(((tvlNow - tvl7dAgo) / tvl7dAgo) * 10000) / 100,
      tvl30dChange: Math.round(((tvlNow - tvl30dAgo) / tvl30dAgo) * 10000) / 100,
    });
  }

  // Solana ecosystem protocols from DeFiLlama
  const protocols = await safe(
    () => fetch('https://api.llama.fi/protocols'),
    null
  );
  let topSolanaProtocols = [];
  if (protocols?.data && Array.isArray(protocols.data)) {
    topSolanaProtocols = protocols.data
      .filter(p => (p.chains || []).includes('Solana'))
      .sort((a, b) => (b.change_7d || 0) - (a.change_7d || 0))
      .slice(0, 15)
      .map(p => ({
        name: p.name,
        category: p.category,
        tvl: Math.round((p.tvl || 0) / 1e6),
        change7d: Math.round((p.change_7d || 0) * 100) / 100,
        change30d: Math.round((p.change_1m || 0) * 100) / 100,
      }));
  }

  return { sources, topGrowingProtocols: topSolanaProtocols };
}

// ── Narrative Analysis ─────────────────────────────────────────────────────────

function analyzeNarratives(onchain, github, market, social) {
  const narratives = [];
  const now = new Date();

  // 1. AI Agents narrative
  const aiRepos = github.categories['ai-agents'] || [];
  if (aiRepos.length >= 2) {
    narratives.push({
      narrative: 'AI Agents on Solana',
      strength: Math.min(10, 3 + aiRepos.length),
      evidence: {
        repos: aiRepos.length,
        topRepos: aiRepos.slice(0, 3).map(r => r.full_name),
        totalStars: aiRepos.reduce((s, r) => s + r.stars, 0),
      },
      insight: 'AI agent frameworks and autonomous trading bots are proliferating on Solana. The intersection of LLMs with onchain actions (swaps, governance voting, NFT minting) is creating a new category.',
      buildIdeas: [
        'AI agent marketplace - let users deploy, share, and monetize autonomous Solana agents',
        'Agent-to-agent communication protocol using Solana for settlement',
        'AI-powered portfolio rebalancer with natural language strategy input',
        'Verifiable AI inference on Solana using ZK proofs for trustless agent outputs',
      ],
    });
  }

  // 2. DeFi growth narrative
  const defiRepos = github.categories['defi'] || [];
  const defiGrowth = social.topGrowingProtocols?.filter(p => 
    ['Dexes', 'Lending', 'Yield', 'Derivatives', 'CDP', 'Liquid Staking'].includes(p.category)
  ) || [];
  const defiBooming = defiGrowth.filter(p => p.change7d > 5);
  if (defiRepos.length >= 1 || defiBooming.length >= 2) {
    const tvlInfo = social.sources.find(s => s.source === 'defillama');
    narratives.push({
      narrative: 'DeFi Renaissance on Solana',
      strength: Math.min(10, 3 + defiBooming.length + defiRepos.length),
      evidence: {
        growingProtocols: defiBooming.length,
        topGrowers: defiBooming.slice(0, 5).map(p => `${p.name} (+${p.change7d}%)`),
        newRepos: defiRepos.length,
        tvl7dChange: tvlInfo?.tvl7dChange || 0,
      },
      insight: 'Solana DeFi is seeing renewed capital inflows and developer activity. Protocols are differentiating through novel mechanisms like concentrated liquidity, real yield, and composable leverage.',
      buildIdeas: [
        'Intent-based DEX aggregator that routes through Jupiter, Orca, and Raydium with MEV protection',
        'Solana-native options protocol with AMM-based pricing (vol surface from Pyth)',
        'Cross-margin account abstraction layer for unified DeFi positions',
        'Real-time DeFi analytics dashboard with narrative tagging',
      ],
    });
  }

  // 3. MEV / Infrastructure narrative
  const mevRepos = github.categories['mev-infrastructure'] || [];
  const infraRepos = github.categories['infrastructure'] || [];
  if (mevRepos.length >= 1 || infraRepos.length >= 2) {
    narratives.push({
      narrative: 'MEV & Infrastructure Maturation',
      strength: Math.min(10, 3 + mevRepos.length + infraRepos.length),
      evidence: {
        mevRepos: mevRepos.length,
        infraRepos: infraRepos.length,
        topRepos: [...mevRepos, ...infraRepos].slice(0, 3).map(r => r.full_name),
      },
      insight: 'MEV on Solana is evolving from basic sandwich attacks to sophisticated infrastructure. Jito bundles, block engine access, and MEV-aware applications are becoming standard.',
      buildIdeas: [
        'MEV protection middleware for dApp developers (like Flashbots Protect for Solana)',
        'MEV dashboard showing real-time extraction, top searchers, and bundle analytics',
        'Priority fee optimizer SDK that dynamically adjusts based on network conditions',
        'Backrunning-as-a-Service for liquidation and arbitrage opportunities',
      ],
    });
  }

  // 4. Token Extensions narrative
  const tokenExtRepos = github.categories['token-extensions'] || [];
  if (tokenExtRepos.length >= 1) {
    narratives.push({
      narrative: 'Token Extensions Adoption Wave',
      strength: Math.min(10, 4 + tokenExtRepos.length * 2),
      evidence: {
        repos: tokenExtRepos.length,
        topRepos: tokenExtRepos.slice(0, 3).map(r => r.full_name),
      },
      insight: 'Token-2022 extensions (transfer fees, confidential transfers, permanent delegates) are enabling new token designs. Expect compliant RWA tokens and programmable money.',
      buildIdeas: [
        'RWA tokenization platform using Token Extensions for compliance (transfer hooks, KYC)',
        'Confidential payment rails for payroll and B2B using confidential transfers',
        'Token launchpad with built-in transfer fees for creator monetization',
        'Interest-bearing stablecoin wrapper using Token Extensions',
      ],
    });
  }

  // 5. Blinks / Actions narrative
  const blinksRepos = github.categories['blinks-actions'] || [];
  if (blinksRepos.length >= 1) {
    narratives.push({
      narrative: 'Blinks & Actions: Web2 Distribution',
      strength: Math.min(10, 4 + blinksRepos.length * 2),
      evidence: {
        repos: blinksRepos.length,
        topRepos: blinksRepos.slice(0, 3).map(r => r.full_name),
      },
      insight: 'Solana Actions and Blinks are embedding onchain interactions into any web surface — tweets, websites, messages. This is a distribution revolution.',
      buildIdeas: [
        'Blink-powered tipping and micropayment system for content creators',
        'E-commerce checkout Blinks that work inside social media posts',
        'Blink builder platform: no-code tool to create custom Solana Actions',
        'Blink analytics: track conversion rates and engagement across embedded actions',
      ],
    });
  }

  // 6. Network activity narrative based on onchain data
  if (onchain.tpsSpikeZScore > 1.5 || onchain.nonVoteTxRatio > 25) {
    narratives.push({
      narrative: 'Network Usage Surge',
      strength: Math.min(10, 4 + Math.round(onchain.tpsSpikeZScore)),
      evidence: {
        avgTps: onchain.avgTps,
        tpsSpike: onchain.tpsSpike,
        spikeZScore: onchain.tpsSpikeZScore,
        nonVoteTxRatio: `${onchain.nonVoteTxRatio}%`,
      },
      insight: `Solana is processing ${onchain.avgTps} TPS with spike z-score of ${onchain.tpsSpikeZScore}. Non-vote transaction ratio of ${onchain.nonVoteTxRatio}% indicates real usage, not just consensus.`,
      buildIdeas: [
        'Real-time network health dashboard with anomaly detection and alerts',
        'Transaction pattern classifier: identify bot vs human activity onchain',
        'Fee market analyzer: predict optimal priority fees based on mempool state',
        'Network stress testing framework for dApp developers',
      ],
    });
  }

  // 7. Memecoin / Speculation narrative from market data
  const memecoins = ['BONK/USD', 'WIF/USD'];
  const volatileMemecoin = memecoins.filter(m => market.volatileAssets.includes(m));
  if (volatileMemecoin.length > 0) {
    narratives.push({
      narrative: 'Memecoin & Speculation Wave',
      strength: Math.min(10, 3 + volatileMemecoin.length * 2),
      evidence: {
        volatileAssets: volatileMemecoin,
        prices: Object.fromEntries(memecoins.map(m => [m, market.prices[m]]).filter(([, v]) => v)),
      },
      insight: 'Memecoins on Solana continue to show elevated volatility, indicating speculative interest. This drives network usage but also creates opportunities for tooling.',
      buildIdeas: [
        'Memecoin launch safety scanner: check for rug pull patterns, locked liquidity, team tokens',
        'Social sentiment tracker: correlate X/Twitter mentions with onchain memecoin volume',
        'Memecoin portfolio tracker with PnL, taxes, and social sharing',
        'Automated memecoin sniping bot with configurable risk parameters and rug detection',
      ],
    });
  }

  // 8. Gaming narrative
  const gamingRepos = github.categories['gaming'] || [];
  if (gamingRepos.length >= 1) {
    narratives.push({
      narrative: 'Gaming & Entertainment',
      strength: Math.min(10, 3 + gamingRepos.length),
      evidence: { repos: gamingRepos.length, topRepos: gamingRepos.slice(0, 3).map(r => r.full_name) },
      insight: 'On-chain gaming is finding product-market fit on Solana thanks to low fees and fast finality.',
      buildIdeas: [
        'Solana game SDK with built-in NFT inventory, token rewards, and leaderboards',
        'Prediction market for esports and in-game events',
        'Cross-game asset standard using compressed NFTs for interoperable items',
      ],
    });
  }

  // 9. Mobile / Consumer narrative
  const mobileRepos = github.categories['mobile'] || [];
  if (mobileRepos.length >= 1) {
    narratives.push({
      narrative: 'Mobile-First Consumer Apps',
      strength: Math.min(10, 4 + mobileRepos.length),
      evidence: { repos: mobileRepos.length, topRepos: mobileRepos.slice(0, 3).map(r => r.full_name) },
      insight: 'Solana Seeker and Mobile Wallet Adapter are enabling a wave of mobile-native crypto apps.',
      buildIdeas: [
        'Mobile-first DeFi app with biometric auth and Solana Pay integration',
        'Location-based token airdrops for events and retail (geofenced Blinks)',
        'Crypto-native super app: wallet + social + DeFi + gaming in one mobile experience',
      ],
    });
  }

  // Always include a cross-chain narrative as it's evergreen
  const crossChainRepos = github.categories['cross-chain'] || [];
  if (crossChainRepos.length >= 1) {
    narratives.push({
      narrative: 'Cross-Chain Interoperability',
      strength: Math.min(10, 3 + crossChainRepos.length),
      evidence: { repos: crossChainRepos.length },
      insight: 'Bridges and cross-chain protocols continue to evolve, with Wormhole and LayerZero driving Solana connectivity.',
      buildIdeas: [
        'Cross-chain intent solver: users specify desired outcome, protocol finds optimal path',
        'Multi-chain portfolio aggregator with Solana as settlement layer',
        'Cross-chain governance: vote on Ethereum DAOs from Solana using bridge messages',
      ],
    });
  }

  // Sort by strength
  narratives.sort((a, b) => b.strength - a.strength);
  return narratives;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 SolSignal - Narrative Detection Engine');
  console.log('=========================================\n');

  const [onchain, github, market, social] = await Promise.all([
    getOnchainMetrics(),
    getGitHubTrending(),
    getPythMarketData(),
    getSocialSignals(),
  ]);

  console.log('\n📊 Analyzing narratives...\n');

  const narratives = analyzeNarratives(onchain, github, market, social);

  const report = {
    meta: {
      tool: 'SolSignal',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      description: 'Solana ecosystem narrative detection and idea generation report',
    },
    summary: {
      totalNarrativesDetected: narratives.length,
      topNarrative: narratives[0]?.narrative || 'None detected',
      topNarrativeStrength: narratives[0]?.strength || 0,
      totalBuildIdeas: narratives.reduce((s, n) => s + n.buildIdeas.length, 0),
    },
    onchainMetrics: onchain,
    marketData: market,
    developerActivity: {
      totalReposAnalyzed: github.totalFound,
      categoryCounts: Object.fromEntries(
        Object.entries(github.categories).map(([k, v]) => [k, v.length])
      ),
      topRepos: github.repos.slice(0, 10).map(r => ({
        name: r.full_name,
        stars: r.stars,
        language: r.language,
        description: r.description,
        url: r.url,
      })),
    },
    ecosystemData: social,
    narratives,
    actionableBuildIdeas: narratives.flatMap(n => 
      n.buildIdeas.map(idea => ({
        idea,
        relatedNarrative: n.narrative,
        narrativeStrength: n.strength,
      }))
    ).sort((a, b) => b.narrativeStrength - a.narrativeStrength),
  };

  // Write report
  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'narrative-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to ${outPath}`);

  // Print summary
  console.log('\n🚀 DETECTED NARRATIVES:');
  console.log('─'.repeat(50));
  for (const n of narratives) {
    console.log(`\n  [${n.strength}/10] ${n.narrative}`);
    console.log(`  └─ ${n.insight.slice(0, 120)}...`);
    console.log(`  └─ Build ideas: ${n.buildIdeas.length}`);
  }
  console.log(`\n📈 Total: ${narratives.length} narratives, ${report.summary.totalBuildIdeas} build ideas`);

  return report;
}

main().catch(console.error);
