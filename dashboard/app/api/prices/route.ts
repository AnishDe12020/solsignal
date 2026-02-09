import { NextResponse } from 'next/server';

const PYTH_FEEDS: Record<string, string> = {
  'SOL/USDC': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BTC/USDC': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USDC': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'JUP/USDC': '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'BONK/USDC': '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
};

const COINGECKO_IDS: Record<string, string> = {
  'SOL/USDC': 'solana',
  'BTC/USDC': 'bitcoin',
  'ETH/USDC': 'ethereum',
};

export async function GET() {
  try {
    const ids = Object.values(PYTH_FEEDS).map(id => `ids[]=${id}`).join('&');
    const url = `https://hermes.pyth.network/api/latest_price_feeds?${ids}`;

    const res = await fetch(url, { next: { revalidate: 30 } });
    const data = await res.json();

    const prices: Record<string, number> = {};

    for (const [asset, feedId] of Object.entries(PYTH_FEEDS)) {
      const feed = data.find((f: any) => f.id === feedId);
      if (feed) {
        prices[asset] = parseFloat(feed.price.price) * Math.pow(10, feed.price.expo);
      }
    }

    // Optional 24h change from CoinGecko (fallback to 0 if unavailable)
    let changes: Record<string, number> = {};
    try {
      const cgIds = Object.values(COINGECKO_IDS).join(',');
      const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`;
      const cgRes = await fetch(cgUrl, { next: { revalidate: 300 } });
      const cgData = await cgRes.json();
      for (const [asset, id] of Object.entries(COINGECKO_IDS)) {
        const change = cgData?.[id]?.usd_24h_change;
        if (typeof change === 'number') {
          changes[asset] = change;
        }
      }
    } catch {
      changes = {};
    }

    return NextResponse.json({ prices, changes, timestamp: Date.now() }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
