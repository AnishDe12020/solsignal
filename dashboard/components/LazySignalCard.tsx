'use client';

import { useRef, useState, useEffect } from 'react';
import type { Signal } from '../lib/types';

interface LazySignalCardProps {
  signal: Signal;
  prices: Record<string, number>;
  now: number;
  index: number;
  isFocused: boolean;
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, publicKey: string) => void;
  formatPrice: (price: number) => string;
  getPnL: (current: number, entry: number, direction: 'long' | 'short') => number;
  formatCountdown: (ms: number) => string;
}

export function LazySignalCard({
  signal, prices, now, index, isFocused, copiedId, onCopy,
  formatPrice, getPnL, formatCountdown,
}: LazySignalCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 6); // First 6 are immediately visible

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  const currentPrice = prices[signal.asset];
  const pnl = currentPrice ? getPnL(currentPrice, signal.entryPrice, signal.direction) : null;
  const isExpired = now > signal.timeHorizon;
  const remaining = signal.timeHorizon - now;

  return (
    <div
      ref={ref}
      data-signal-card
      className={`transition-all ${isFocused ? 'ring-2 ring-emerald-500/50 rounded-lg' : ''}`}
    >
      {!visible ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 h-[180px]">
          <div className="skeleton h-5 w-32 mb-3" />
          <div className="skeleton h-4 w-48 mb-4" />
          <div className="grid grid-cols-5 gap-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      ) : (
        <a
          href={`/signal/${signal.publicKey}`}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 block hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {signal.direction === 'long' ? '📈' : '📉'}
              </span>
              <div>
                <div className="font-semibold text-lg">{signal.asset}</div>
                <div className="text-sm text-zinc-400">by @{signal.agent.slice(0, 8)}...</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentPrice && (
                <div className={`text-sm font-medium ${pnl && pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${formatPrice(currentPrice)} ({pnl ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%' : '...'})
                </div>
              )}
              {/* Copy Signal ID button */}
              <button
                onClick={(e) => onCopy(e, signal.publicKey)}
                className="text-xs text-zinc-500 hover:text-emerald-400 font-mono border border-zinc-700 hover:border-emerald-700 px-2 py-1 rounded transition-colors"
                title="Copy Signal ID"
              >
                {copiedId === signal.publicKey ? 'Copied!' : 'Copy ID'}
              </button>
              <a
                href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                onClick={(e) => e.stopPropagation()}
              >
                {signal.publicKey.slice(0, 8)}...
              </a>
              <div
                className={`text-sm font-medium px-2 py-1 rounded ${
                  signal.direction === 'long'
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : 'bg-red-900/50 text-red-400'
                }`}
              >
                {signal.direction.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Confidence</div>
              <div className="font-medium">{signal.confidence}%</div>
            </div>
            <div>
              <div className="text-zinc-500">Entry</div>
              <div className="font-medium">${formatPrice(signal.entryPrice)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Target</div>
              <div className="font-medium text-emerald-400">
                ${formatPrice(signal.targetPrice)} (+{((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Stop Loss</div>
              <div className="font-medium text-red-400">
                ${formatPrice(signal.stopLoss)} ({((signal.stopLoss / signal.entryPrice - 1) * 100).toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Status</div>
              <div className={`font-medium ${isExpired ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {isExpired ? 'Expired (awaiting resolution)' : `${formatCountdown(remaining)} remaining`}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
            <div>
              Created: {new Date(signal.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  signal.outcome === 'pending'
                    ? isExpired ? 'bg-yellow-500' : 'bg-blue-500 animate-pulse'
                    : signal.outcome === 'correct'
                    ? 'bg-emerald-500'
                    : signal.outcome === 'incorrect'
                    ? 'bg-red-500'
                    : 'bg-zinc-500'
                }`}
              />
              {signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)}
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
