// Fetch current prices from Pyth for our signal assets
const PYTH_FEEDS = {
  'SOL/USDC': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC/USDC': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USDC': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

async function fetchPrices() {
  const ids = Object.values(PYTH_FEEDS).map(id => `ids[]=${id}`).join('&');
  const url = `https://hermes.pyth.network/api/latest_price_feeds?${ids}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('=== Current Prices (Pyth Network) ===\n');
  
  for (const [asset, feedId] of Object.entries(PYTH_FEEDS)) {
    const feed = data.find(f => f.id === feedId);
    if (feed) {
      const price = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
      console.log(`${asset}: $${price.toFixed(2)}`);
    }
  }
  
  console.log('\n=== Signal Analysis ===\n');
  
  // Compare to our signals
  const solPrice = parseFloat(data.find(f => f.id === PYTH_FEEDS['SOL/USDC']).price.price) * 1e-8;
  const btcPrice = parseFloat(data.find(f => f.id === PYTH_FEEDS['BTC/USDC']).price.price) * 1e-8;
  const ethPrice = parseFloat(data.find(f => f.id === PYTH_FEEDS['ETH/USDC']).price.price) * 1e-8;
  
  console.log(`SOL/USDC LONG: Entry $125, Target $145, Current $${solPrice.toFixed(2)}`);
  console.log(`  Progress: ${((solPrice - 125) / (145 - 125) * 100).toFixed(1)}% to target`);
  
  console.log(`BTC/USDC SHORT: Entry $97500, Target $92000, Current $${btcPrice.toFixed(2)}`);
  console.log(`  Progress: ${((97500 - btcPrice) / (97500 - 92000) * 100).toFixed(1)}% to target`);
  
  console.log(`ETH/USDC LONG: Entry $2650, Target $2850, Current $${ethPrice.toFixed(2)}`);
  console.log(`  Progress: ${((ethPrice - 2650) / (2850 - 2650) * 100).toFixed(1)}% to target`);
}

fetchPrices().catch(console.error);
