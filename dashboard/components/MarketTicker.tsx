'use client';

import { usePrices } from '../hooks/usePrices';

const TOP_ASSETS = ['SOL/USDC', 'BTC/USDC', 'ETH/USDC'];
const ASSET_ICONS: Record<string, string> = {
  'SOL/USDC': '◎',
  'BTC/USDC': '₿',
  'ETH/USDC': 'Ξ',
};

function formatPrice(price: number): string {
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatChange(change?: number): string {
  if (change === undefined || Number.isNaN(change)) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function MarketTicker() {
  const { prices, changes, loading } = usePrices();

  if (loading) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto py-3 px-1 -mx-1">
        {TOP_ASSETS.map((a) => (
          <div key={a} className="flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 w-40">
            <div className="skeleton h-3 w-16 mb-2" />
            <div className="skeleton h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const hasPrices = TOP_ASSETS.some(a => prices[a]);
  if (!hasPrices) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-zinc-500 font-medium">Market Overview</span>
        <span className="text-xs text-zinc-600">· Pyth Oracle</span>
        <span className="text-xs text-zinc-600">· 24h change</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TOP_ASSETS.map((asset) => {
          const price = prices[asset];
          if (!price) return null;
          const name = asset.split('/')[0];
          const icon = ASSET_ICONS[asset] || '•';
          const change = changes?.[asset];
          const changePositive = typeof change === 'number' ? change >= 0 : true;

          return (
            <div
              key={asset}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-emerald-400 shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{name}</div>
                <div className="text-lg font-bold text-zinc-100">${formatPrice(price)}</div>
                <div className={`text-xs mt-1 ${changePositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {changePositive ? '▲' : '▼'} {formatChange(change)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
