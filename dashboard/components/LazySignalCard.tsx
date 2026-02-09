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

function OutcomeBadge({ outcome, isExpired }: { outcome: string; isExpired: boolean }) {
  if (outcome === 'correct') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wide">
        ✅ Correct
      </span>
    );
  }
  if (outcome === 'incorrect') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wide">
        ❌ Incorrect
      </span>
    );
  }
  if (outcome === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/20 border border-zinc-500/40 text-zinc-400 text-xs font-bold uppercase tracking-wide">
        ⏰ Expired
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold uppercase tracking-wide badge-pulse">
        ⏳ Awaiting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      Active
    </span>
  );
}

export function LazySignalCard({
  signal, prices, now, index, isFocused, copiedId, onCopy,
  formatPrice, getPnL, formatCountdown,
}: LazySignalCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 6);

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
  const isResolved = signal.outcome === 'correct' || signal.outcome === 'incorrect' || signal.outcome === 'expired';

  return (
    <div
      ref={ref}
      data-signal-card
      className={`transition-all ${isFocused ? 'ring-2 ring-emerald-500/50 rounded-lg' : ''}`}
    >
      {!visible ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6 h-[180px]">
          <div className="skeleton h-5 w-32 mb-3" />
          <div className="skeleton h-4 w-48 mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full hidden sm:block" />
            <div className="skeleton h-10 w-full hidden sm:block" />
          </div>
        </div>
      ) : (
        <a
          href={`/signal/${signal.publicKey}`}
          className={`bg-zinc-900 border rounded-lg p-4 sm:p-6 block hover:border-zinc-700 transition-colors ${
            isResolved
              ? signal.outcome === 'correct'
                ? 'border-emerald-800/50'
                : signal.outcome === 'incorrect'
                ? 'border-red-800/50'
                : 'border-zinc-700/50'
              : 'border-zinc-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {signal.direction === 'long' ? '📈' : '📉'}
              </span>
              <div>
                <div className="font-semibold text-lg">{signal.asset}</div>
                <div className="text-sm text-zinc-400">by @{signal.agent.slice(0, 8)}...</div>
              </div>
              <OutcomeBadge outcome={signal.outcome} isExpired={isExpired} />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {currentPrice && (
                <div className={`text-sm font-medium ${pnl && pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${formatPrice(currentPrice)} ({pnl ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%' : '...'})
                </div>
              )}
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
                className="text-xs text-zinc-500 hover:text-zinc-300 font-mono hidden sm:inline"
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 text-sm">
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
              <div className="text-zinc-500">Time Left</div>
              <div className={`font-medium ${isExpired ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {isExpired ? 'Expired' : `${formatCountdown(remaining)}`}
              </div>
            </div>
          </div>

          {isResolved && (
            <div className={`mt-4 pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm ${
              signal.outcome === 'correct'
                ? 'border-emerald-800/40'
                : signal.outcome === 'incorrect'
                ? 'border-red-800/40'
                : 'border-zinc-700/40'
            }`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`font-bold ${
                  signal.outcome === 'correct' ? 'text-emerald-400' : signal.outcome === 'incorrect' ? 'text-red-400' : 'text-zinc-400'
                }`}>
                  {signal.outcome === 'correct' ? '✅ Signal was CORRECT' : signal.outcome === 'incorrect' ? '❌ Signal was INCORRECT' : '⏰ Signal EXPIRED'}
                </span>
                {typeof signal.resolutionPrice === 'number' && signal.resolutionPrice > 0 && (
                  <span className="text-xs text-zinc-400">
                    Outcome price: <span className="font-medium text-zinc-200">${formatPrice(signal.resolutionPrice)}</span>
                  </span>
                )}
              </div>
              <a
                href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400/70 hover:text-emerald-400 font-mono flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Verify on Solscan →
              </a>
            </div>
          )}

          {!isResolved && (
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
              <div>
                Created: {new Date(signal.createdAt).toLocaleString()}
              </div>
              <a
                href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-emerald-400 font-mono flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Verify on-chain →
              </a>
            </div>
          )}
        </a>
      )}
    </div>
  );
}
