'use client';

import { useState, useMemo } from 'react';
import { useSignals } from '../../hooks/useSignals';
import { usePrices } from '../../hooks/usePrices';
import type { Signal } from '../../lib/types';

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

function getRiskReward(signal: Signal): string {
  const reward = Math.abs(signal.targetPrice - signal.entryPrice);
  const risk = Math.abs(signal.entryPrice - signal.stopLoss);
  if (risk === 0) return 'N/A';
  return (reward / risk).toFixed(2);
}

function SignalSelector({ signals, selected, onSelect, label }: {
  signals: Signal[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-1.5">{label}</label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
      >
        <option value="">Select a signal...</option>
        {signals.map(s => (
          <option key={s.publicKey} value={s.publicKey}>
            {s.asset} {s.direction.toUpperCase()} — {s.confidence}% — @{s.agent.slice(0, 8)}...
          </option>
        ))}
      </select>
    </div>
  );
}

function ComparisonCard({ signal, prices, label }: {
  signal: Signal;
  prices: Record<string, number>;
  label: string;
}) {
  const currentPrice = prices[signal.asset];
  const pnl = currentPrice ? getPnL(currentPrice, signal.entryPrice, signal.direction) : null;
  const targetPct = ((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1);
  const stopPct = ((signal.stopLoss / signal.entryPrice - 1) * 100).toFixed(1);
  const rr = getRiskReward(signal);
  const now = Date.now();
  const isExpired = now > signal.timeHorizon;
  const remaining = signal.timeHorizon - now;
  const hoursLeft = Math.floor(remaining / 3600000);
  const minutesLeft = Math.floor((remaining % 3600000) / 60000);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex-1">
      <div className="text-xs text-zinc-500 mb-3">{label}</div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{signal.direction === 'long' ? '📈' : '📉'}</span>
        <div>
          <div className="font-semibold text-lg">{signal.asset}</div>
          <div className="text-sm text-zinc-400">by @{signal.agent.slice(0, 8)}...</div>
        </div>
        <div className={`ml-auto text-sm font-medium px-2 py-1 rounded ${
          signal.direction === 'long' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
        }`}>
          {signal.direction.toUpperCase()}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Confidence</span>
          <span className="font-medium">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${signal.confidence}%` }} />
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">Entry Price</span>
          <span className="font-mono font-medium">${formatPrice(signal.entryPrice)}</span>
        </div>
        {currentPrice && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Current Price</span>
            <span className="font-mono font-medium">${formatPrice(currentPrice)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-500">Target Price</span>
          <span className="font-mono text-emerald-400">${formatPrice(signal.targetPrice)} (+{targetPct}%)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Stop Loss</span>
          <span className="font-mono text-red-400">${formatPrice(signal.stopLoss)} ({stopPct}%)</span>
        </div>

        <div className="border-t border-zinc-800 pt-3 mt-3" />

        <div className="flex justify-between">
          <span className="text-zinc-500">Risk/Reward</span>
          <span className="font-medium">{rr}x</span>
        </div>
        {pnl !== null && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Current P&L</span>
            <span className={`font-mono font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-500">Status</span>
          <span className={isExpired ? 'text-yellow-400' : 'text-emerald-400'}>
            {signal.outcome !== 'pending'
              ? signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)
              : isExpired
              ? 'Expired (awaiting resolution)'
              : `${hoursLeft > 0 ? `${hoursLeft}h ` : ''}${minutesLeft}m remaining`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Outcome</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              signal.outcome === 'pending' ? (isExpired ? 'bg-yellow-500' : 'bg-blue-500 animate-pulse')
              : signal.outcome === 'correct' ? 'bg-emerald-500'
              : signal.outcome === 'incorrect' ? 'bg-red-500'
              : 'bg-zinc-500'
            }`} />
            <span>{signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Created</span>
          <span className="text-zinc-300 text-xs">{new Date(signal.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <a
        href={`/signal/${signal.publicKey}`}
        className="block mt-4 text-center text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        View full details
      </a>
    </div>
  );
}

export default function ComparePage() {
  const { signals, loading } = useSignals();
  const { prices } = usePrices();
  const [signalA, setSignalA] = useState('');
  const [signalB, setSignalB] = useState('');

  const selectedA = useMemo(() => signals.find(s => s.publicKey === signalA), [signals, signalA]);
  const selectedB = useMemo(() => signals.find(s => s.publicKey === signalB), [signals, signalB]);

  // Exclude already-selected signals from the other picker
  const optionsA = useMemo(() => signals.filter(s => s.publicKey !== signalB), [signals, signalB]);
  const optionsB = useMemo(() => signals.filter(s => s.publicKey !== signalA), [signals, signalA]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Compare Signals</h1>
        <p className="text-zinc-400">Select two signals to compare side by side.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Selectors */}
          <div className="grid md:grid-cols-2 gap-4">
            <SignalSelector signals={optionsA} selected={signalA} onSelect={setSignalA} label="Signal A" />
            <SignalSelector signals={optionsB} selected={signalB} onSelect={setSignalB} label="Signal B" />
          </div>

          {/* Comparison */}
          {selectedA && selectedB ? (
            <div className="flex gap-4 flex-col md:flex-row">
              <ComparisonCard signal={selectedA} prices={prices} label="Signal A" />
              {/* VS divider */}
              <div className="hidden md:flex items-center">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                  VS
                </div>
              </div>
              <div className="flex md:hidden items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                  VS
                </div>
              </div>
              <ComparisonCard signal={selectedB} prices={prices} label="Signal B" />
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-600 text-sm">
              {signals.length < 2
                ? 'Need at least 2 signals to compare.'
                : 'Select two signals above to compare them side by side.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
