'use client';

import { Signal } from '../hooks/useSignals';

const AGENT_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600',
  'bg-pink-600', 'bg-cyan-600', 'bg-rose-600', 'bg-indigo-600',
];

function getAgentColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0;
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function getAgentInitials(address: string): string {
  return address.slice(0, 2).toUpperCase();
}

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

function OutcomeBadge({ outcome, isExpired }: { outcome: string; isExpired: boolean }) {
  if (outcome === 'correct') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
        ✅ CORRECT
      </span>
    );
  }
  if (outcome === 'incorrect') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
        ❌ INCORRECT
      </span>
    );
  }
  if (outcome === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-500/20 border border-zinc-500/40 text-zinc-400">
        ⏰ EXPIRED
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 badge-pulse">
        ⏳ AWAITING
      </span>
    );
  }
  return null;
}

interface SignalFeedProps {
  signals: Signal[];
  prices: Record<string, number>;
}

export function SignalFeed({ signals, prices }: SignalFeedProps) {
  const sorted = [...signals].sort((a, b) => b.createdAt - a.createdAt);
  const now = Date.now();

  return (
    <div className="space-y-4">
      {sorted.map(signal => {
        const currentPrice = prices[signal.asset];
        const pnl = currentPrice
          ? signal.direction === 'long'
            ? ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100
            : ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100
          : null;
        const isActive = signal.outcome === 'pending' && now <= signal.timeHorizon;
        const isExpired = signal.outcome === 'pending' && now > signal.timeHorizon;
        const remaining = signal.timeHorizon - now;
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const isResolved = signal.outcome === 'correct' || signal.outcome === 'incorrect' || signal.outcome === 'expired';

        return (
          <a
            key={signal.publicKey}
            href={`/signal/${signal.publicKey}`}
            className={`block bg-zinc-900 dark:bg-zinc-900 border rounded-xl p-4 sm:p-5 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-900/50 ${
              isResolved
                ? signal.outcome === 'correct'
                  ? 'border-emerald-800/40'
                  : signal.outcome === 'incorrect'
                  ? 'border-red-800/40'
                  : 'border-zinc-700'
                : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full ${getAgentColor(signal.agent)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {getAgentInitials(signal.agent)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-100 truncate">@{signal.agent.slice(0, 8)}...</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    signal.direction === 'long' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {signal.direction.toUpperCase()}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Live
                    </span>
                  )}
                  <OutcomeBadge outcome={signal.outcome} isExpired={isExpired} />
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {timeAgo(signal.createdAt)}
                </div>
              </div>
            </div>

            <div className="sm:pl-[52px]">
              <p className="text-zinc-200 mb-3 text-sm sm:text-base">
                <span className="font-semibold">{signal.asset}</span>
                {' '}
                <span className={signal.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                  {signal.direction === 'long' ? 'Long' : 'Short'}
                </span>
                {' at '}
                <span className="font-mono">${formatPrice(signal.entryPrice)}</span>
                {' — targeting '}
                <span className="text-emerald-400 font-mono">${formatPrice(signal.targetPrice)}</span>
                {' ('}
                <span className="text-emerald-400">
                  +{((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1)}%
                </span>
                {')'}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">Confidence</span>
                  <span className="font-medium text-zinc-200">{signal.confidence}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">Stop</span>
                  <span className="font-mono text-red-400">${formatPrice(signal.stopLoss)}</span>
                </span>
                {currentPrice && pnl !== null && (
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">P&L</span>
                    <span className={`font-mono font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                    </span>
                  </span>
                )}
                {isActive && remaining > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">Expires</span>
                    <span className="text-zinc-200">{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}</span>
                  </span>
                )}
                {isResolved && typeof signal.resolutionPrice === 'number' && signal.resolutionPrice > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500">Outcome</span>
                    <span className="font-mono text-zinc-200">${formatPrice(signal.resolutionPrice)}</span>
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs">
                <a
                  href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-emerald-400 font-mono"
                  onClick={(e) => e.stopPropagation()}
                >
                  Verify on Solscan →
                </a>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
