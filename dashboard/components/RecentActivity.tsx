'use client';

import type { Signal } from '../lib/types';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(10);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toLocaleString();
}

function OutcomeDot({ outcome }: { outcome: string }) {
  if (outcome === 'correct') return <span className="text-[10px] ml-1 text-emerald-400">✅</span>;
  if (outcome === 'incorrect') return <span className="text-[10px] ml-1 text-red-400">❌</span>;
  if (outcome === 'expired') return <span className="text-[10px] ml-1 text-zinc-400">⏰</span>;
  return null;
}

interface RecentActivityProps {
  signals: Signal[];
  limit?: number;
}

export function RecentActivity({ signals, limit = 8 }: RecentActivityProps) {
  const sorted = [...signals].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

  if (sorted.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-bold mb-1">Recent Activity</h2>
      <p className="text-sm text-zinc-500 mb-6">Latest signal publications on-chain</p>
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-zinc-800" />

        <div className="space-y-0">
          {sorted.map((signal) => (
            <a
              key={signal.publicKey}
              href={`/signal/${signal.publicKey}`}
              className="relative flex items-start gap-4 py-3 group hover:bg-zinc-900/50 rounded-lg transition-colors -ml-2 px-2 pl-10"
            >
              <div className={`absolute left-[11px] top-[18px] w-[9px] h-[9px] rounded-full border-2 z-10 ${
                signal.outcome === 'correct'
                  ? 'border-emerald-500 bg-emerald-500/30'
                  : signal.outcome === 'incorrect'
                  ? 'border-red-500 bg-red-500/30'
                  : 'border-zinc-700 bg-zinc-950 group-hover:border-emerald-500'
              } transition-colors`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    signal.direction === 'long' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {signal.direction.toUpperCase()}
                  </span>
                  <span className="font-medium text-sm text-zinc-100">{signal.asset}</span>
                  <span className="text-xs text-zinc-600">at ${formatPrice(signal.entryPrice)}</span>
                  <OutcomeDot outcome={signal.outcome} />
                  {(signal.outcome === 'correct' || signal.outcome === 'incorrect') && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      signal.outcome === 'correct'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {signal.outcome.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 flex-wrap">
                  <span>@{signal.agent.slice(0, 8)}...</span>
                  <span>{signal.confidence}% conf</span>
                  <span className="text-emerald-600">target ${formatPrice(signal.targetPrice)}</span>
                  <a
                    href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-emerald-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Solscan
                  </a>
                </div>
              </div>

              <div className="text-xs text-zinc-600 whitespace-nowrap pt-0.5">
                {timeAgo(signal.createdAt)}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
