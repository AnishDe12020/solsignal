'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSignals, Signal } from '../../hooks/useSignals';
import { usePrices } from '../../hooks/usePrices';

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(10);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toLocaleString();
}

function getPnL(current: number, entry: number, direction: 'long' | 'short'): number {
  if (direction === 'long') return ((current - entry) / entry) * 100;
  return ((entry - current) / entry) * 100;
}

export default function PortfolioPage() {
  const { signals, loading } = useSignals();
  const { prices } = usePrices();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const longCount = signals.filter(s => s.direction === 'long').length;
    const shortCount = signals.filter(s => s.direction === 'short').length;
    const total = signals.length;

    // Average confidence
    const avgConfidence = total > 0
      ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / total)
      : 0;

    // Time horizon distribution
    const horizonBuckets: Record<string, number> = {};
    signals.forEach(s => {
      const durationMs = s.timeHorizon - s.createdAt;
      const hours = Math.round(durationMs / 3600000);
      let label: string;
      if (hours <= 6) label = '6h';
      else if (hours <= 12) label = '12h';
      else if (hours <= 24) label = '24h';
      else if (hours <= 48) label = '48h';
      else if (hours <= 72) label = '72h';
      else label = '1w+';
      horizonBuckets[label] = (horizonBuckets[label] || 0) + 1;
    });

    // Simulated P&L: for each signal, calculate what P&L would be
    // if the signal was followed. Use current price for active signals,
    // or target/stop based on outcome for resolved ones.
    let totalPnl = 0;
    let signalsWithPnl = 0;
    signals.forEach(s => {
      const currentPrice = prices[s.asset];
      if (s.outcome === 'correct') {
        // Hit target
        const pnl = getPnL(s.targetPrice, s.entryPrice, s.direction);
        totalPnl += pnl;
        signalsWithPnl++;
      } else if (s.outcome === 'incorrect') {
        // Hit stop loss
        const pnl = getPnL(s.stopLoss, s.entryPrice, s.direction);
        totalPnl += pnl;
        signalsWithPnl++;
      } else if (currentPrice) {
        // Active/pending - use current market price
        const pnl = getPnL(currentPrice, s.entryPrice, s.direction);
        totalPnl += pnl;
        signalsWithPnl++;
      }
    });

    // Per-asset P&L breakdown
    const assetPnl: Record<string, { pnl: number; count: number }> = {};
    signals.forEach(s => {
      const currentPrice = prices[s.asset];
      let pnl = 0;
      if (s.outcome === 'correct') {
        pnl = getPnL(s.targetPrice, s.entryPrice, s.direction);
      } else if (s.outcome === 'incorrect') {
        pnl = getPnL(s.stopLoss, s.entryPrice, s.direction);
      } else if (currentPrice) {
        pnl = getPnL(currentPrice, s.entryPrice, s.direction);
      }
      if (!assetPnl[s.asset]) assetPnl[s.asset] = { pnl: 0, count: 0 };
      assetPnl[s.asset].pnl += pnl;
      assetPnl[s.asset].count++;
    });

    return {
      longCount,
      shortCount,
      total,
      avgConfidence,
      horizonBuckets,
      totalPnl,
      signalsWithPnl,
      assetPnl,
    };
  }, [signals, prices]);

  const longPct = stats.total > 0 ? (stats.longCount / stats.total) * 100 : 0;
  const shortPct = stats.total > 0 ? (stats.shortCount / stats.total) * 100 : 0;

  const horizonOrder = ['6h', '12h', '24h', '48h', '72h', '1w+'];
  const maxHorizonCount = Math.max(...Object.values(stats.horizonBuckets), 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-lg" />
          <div className="skeleton h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Portfolio Tracker</h1>
        <p className="text-zinc-400 text-sm">
          Aggregate view of all signals — direction split, confidence, horizons, and simulated P&L.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
          <div className="text-3xl font-bold text-emerald-400">{stats.total}</div>
          <div className="text-sm text-zinc-500 mt-1">Total Signals</div>
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.avgConfidence}%</div>
          <div className="text-sm text-zinc-500 mt-1">Avg Confidence</div>
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
          <div className={`text-3xl font-bold ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(1)}%
          </div>
          <div className="text-sm text-zinc-500 mt-1">Simulated P&L</div>
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
          <div className="text-3xl font-bold text-white">{stats.signalsWithPnl}</div>
          <div className="text-sm text-zinc-500 mt-1">Signals Tracked</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Direction Pie (CSS-only) */}
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Signals by Direction</h3>
          <div className="flex items-center gap-8">
            {/* CSS conic-gradient pie chart */}
            <div
              className="w-32 h-32 rounded-full flex-shrink-0"
              style={{
                background: `conic-gradient(
                  rgb(52 211 153) 0deg ${longPct * 3.6}deg,
                  rgb(248 113 113) ${longPct * 3.6}deg 360deg
                )`,
              }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-zinc-300">{stats.total}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span className="text-sm text-zinc-300">Long</span>
                <span className="text-sm font-medium text-zinc-100 ml-auto">{stats.longCount}</span>
                <span className="text-xs text-zinc-500">({longPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-sm text-zinc-300">Short</span>
                <span className="text-sm font-medium text-zinc-100 ml-auto">{stats.shortCount}</span>
                <span className="text-xs text-zinc-500">({shortPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Horizon Distribution */}
        <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Time Horizon Distribution</h3>
          <div className="space-y-3">
            {horizonOrder.map(label => {
              const count = stats.horizonBuckets[label] || 0;
              const pct = (count / maxHorizonCount) * 100;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400 w-10 text-right">{label}</span>
                  <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-300 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-asset P&L breakdown */}
      <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Simulated P&L by Asset</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Uses target price for correct, stop loss for incorrect, and current market price for active signals.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.assetPnl)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([asset, data]) => (
              <div key={asset} className="bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{asset}</span>
                  <span className="text-xs text-zinc-500">{data.count} signals</span>
                </div>
                <div className={`text-2xl font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(2)}%
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Avg: {data.count > 0 ? (data.pnl / data.count >= 0 ? '+' : '') + (data.pnl / data.count).toFixed(2) : '0.00'}% per signal
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recent signals table */}
      <div className="bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">All Signals</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 pr-4">Asset</th>
                <th className="text-left py-2 pr-4">Direction</th>
                <th className="text-right py-2 pr-4">Confidence</th>
                <th className="text-right py-2 pr-4">Entry</th>
                <th className="text-right py-2 pr-4">Target</th>
                <th className="text-right py-2 pr-4">P&L</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {signals
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(s => {
                  const currentPrice = prices[s.asset];
                  let pnl: number | null = null;
                  if (s.outcome === 'correct') pnl = getPnL(s.targetPrice, s.entryPrice, s.direction);
                  else if (s.outcome === 'incorrect') pnl = getPnL(s.stopLoss, s.entryPrice, s.direction);
                  else if (currentPrice) pnl = getPnL(currentPrice, s.entryPrice, s.direction);
                  const isActive = s.outcome === 'pending' && now <= s.timeHorizon;

                  return (
                    <tr key={s.publicKey} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2.5 pr-4">
                        <a href={`/signal/${s.publicKey}`} className="text-emerald-400 hover:text-emerald-300">
                          {s.asset}
                        </a>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          s.direction === 'long' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                        }`}>
                          {s.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">{s.confidence}%</td>
                      <td className="py-2.5 pr-4 text-right font-mono">${formatPrice(s.entryPrice)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">${formatPrice(s.targetPrice)}</td>
                      <td className={`py-2.5 pr-4 text-right font-mono ${
                        pnl !== null ? (pnl >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'
                      }`}>
                        {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-2.5">
                        <span className={`flex items-center gap-1.5 text-xs ${
                          s.outcome === 'correct' ? 'text-emerald-400' :
                          s.outcome === 'incorrect' ? 'text-red-400' :
                          isActive ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            s.outcome === 'correct' ? 'bg-emerald-400' :
                            s.outcome === 'incorrect' ? 'bg-red-400' :
                            isActive ? 'bg-blue-400 animate-pulse' : 'bg-yellow-400'
                          }`} />
                          {s.outcome === 'pending' ? (isActive ? 'Active' : 'Expired') : s.outcome}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
