'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePrices } from '../../../hooks/usePrices';
import { Breadcrumb } from '../../../components/Breadcrumb';

interface SignalDetail {
  publicKey: string;
  agent: string;
  index: number;
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number;
  reasoningHash: string;
  createdAt: number;
  resolved: boolean;
  outcome: 'pending' | 'correct' | 'incorrect' | 'expired';
  resolutionPrice: number;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toFixed(10);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toLocaleString();
}

function getPnL(current: number, entry: number, direction: 'long' | 'short'): number {
  if (direction === 'long') {
    return ((current - entry) / entry) * 100;
  }
  return ((entry - current) / entry) * 100;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function ResolutionBanner({ signal }: { signal: SignalDetail }) {
  if (signal.outcome === 'correct') {
    const pnl = signal.resolutionPrice > 0
      ? getPnL(signal.resolutionPrice, signal.entryPrice, signal.direction)
      : null;
    return (
      <div className="rounded-xl p-5 sm:p-6 bg-emerald-900/30 border-2 border-emerald-500/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">CORRECT ✅</div>
              <div className="text-sm text-emerald-200/70">Signal prediction was accurate</div>
            </div>
          </div>
          <div className="text-right">
            {signal.resolutionPrice > 0 && (
              <div>
                <div className="text-xs text-emerald-400/60 uppercase tracking-wide">Resolution Price</div>
                <div className="text-2xl font-bold text-emerald-400">${formatPrice(signal.resolutionPrice)}</div>
                {pnl !== null && (
                  <div className="text-sm text-emerald-300/80">
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}% P&L
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (signal.outcome === 'incorrect') {
    const pnl = signal.resolutionPrice > 0
      ? getPnL(signal.resolutionPrice, signal.entryPrice, signal.direction)
      : null;
    return (
      <div className="rounded-xl p-5 sm:p-6 bg-red-900/30 border-2 border-red-500/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">INCORRECT ❌</div>
              <div className="text-sm text-red-200/70">Signal prediction missed target</div>
            </div>
          </div>
          <div className="text-right">
            {signal.resolutionPrice > 0 && (
              <div>
                <div className="text-xs text-red-400/60 uppercase tracking-wide">Resolution Price</div>
                <div className="text-2xl font-bold text-red-400">${formatPrice(signal.resolutionPrice)}</div>
                {pnl !== null && (
                  <div className="text-sm text-red-300/80">
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}% P&L
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (signal.outcome === 'expired') {
    return (
      <div className="rounded-xl p-5 sm:p-6 bg-zinc-800/50 border-2 border-zinc-600/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-600/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-300">EXPIRED ⏰</div>
            <div className="text-sm text-zinc-400">Signal expired without resolution</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function SignalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { prices } = usePrices();
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    async function fetchSignal() {
      try {
        const res = await fetch(`/api/signals/${id}`);
        if (!res.ok) {
          setError('Signal not found');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSignal(data);
        setLoading(false);
      } catch {
        setError('Failed to fetch signal');
        setLoading(false);
      }
    }
    fetchSignal();
    const interval = setInterval(fetchSignal, 60000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!signal) return;
    function tick() {
      const remaining = signal!.timeHorizon - Date.now();
      setCountdown(formatCountdown(remaining));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [signal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading signal from chain...</p>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Signal Not Found</h1>
        <p className="text-zinc-400 mb-6">{error || 'This signal does not exist on-chain.'}</p>
        <a href="/" className="text-emerald-400 hover:text-emerald-300 underline">
          Back to signals
        </a>
      </div>
    );
  }

  const currentPrice = prices[signal.asset];
  const pnl = currentPrice ? getPnL(currentPrice, signal.entryPrice, signal.direction) : null;
  const isExpired = Date.now() > signal.timeHorizon;
  const targetPct = ((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1);
  const stopPct = ((signal.stopLoss / signal.entryPrice - 1) * 100).toFixed(1);
  const isResolved = signal.outcome !== 'pending';

  let progressPct = 0;
  if (currentPrice) {
    if (signal.direction === 'long') {
      progressPct = Math.min(100, Math.max(0, ((currentPrice - signal.entryPrice) / (signal.targetPrice - signal.entryPrice)) * 100));
    } else {
      progressPct = Math.min(100, Math.max(0, ((signal.entryPrice - currentPrice) / (signal.entryPrice - signal.targetPrice)) * 100));
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Signals', href: '/#signals' },
        { label: `${signal.asset} #${signal.index}` },
      ]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">
            {signal.direction === 'long' ? '📈' : '📉'}
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{signal.asset}</h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              Signal #{signal.index} by{' '}
              <a
                href={`https://solscan.io/account/${signal.agent}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono"
              >
                {signal.agent.slice(0, 8)}...{signal.agent.slice(-4)}
              </a>
            </p>
          </div>
        </div>
        <div className={`text-lg font-bold px-4 py-2 rounded-lg ${
          signal.direction === 'long'
            ? 'bg-emerald-900/50 text-emerald-400'
            : 'bg-red-900/50 text-red-400'
        }`}>
          {signal.direction.toUpperCase()}
        </div>
      </div>

      {isResolved && <ResolutionBanner signal={signal} />}

      {!isResolved && (
        <div className={`rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
          isExpired
            ? 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-200'
            : 'bg-blue-900/20 border border-blue-700/50 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              isExpired ? 'bg-yellow-500 badge-pulse' : 'bg-blue-500 badge-pulse'
            }`}></span>
            <span className="font-medium">
              {isExpired ? 'Awaiting Resolution' : 'Active'}
            </span>
          </div>
          <div className="text-sm font-mono">
            {isExpired ? 'Expired' : countdown}
          </div>
        </div>
      )}

      {currentPrice && !isResolved && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-500">Current Price</div>
              <div className="text-2xl sm:text-3xl font-bold">${formatPrice(currentPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Unrealized P&L</div>
              <div className={`text-2xl sm:text-3xl font-bold ${pnl && pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnl !== null ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%' : '...'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Entry: ${formatPrice(signal.entryPrice)}</span>
              <span>Target: ${formatPrice(signal.targetPrice)}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pnl && pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Confidence</div>
          <div className="text-xl sm:text-2xl font-bold">{signal.confidence}%</div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${signal.confidence}%` }}></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Entry Price</div>
          <div className="text-xl sm:text-2xl font-bold">${formatPrice(signal.entryPrice)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Target Price</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">
            ${formatPrice(signal.targetPrice)}
          </div>
          <div className="text-xs text-emerald-400/70">+{targetPct}%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Stop Loss</div>
          <div className="text-xl sm:text-2xl font-bold text-red-400">
            ${formatPrice(signal.stopLoss)}
          </div>
          <div className="text-xs text-red-400/70">{stopPct}%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Created</div>
          <div className="text-base sm:text-lg font-medium">{new Date(signal.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-zinc-500">{new Date(signal.createdAt).toLocaleTimeString()}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Expires</div>
          <div className="text-base sm:text-lg font-medium">{new Date(signal.timeHorizon).toLocaleDateString()}</div>
          <div className="text-xs text-zinc-500">{new Date(signal.timeHorizon).toLocaleTimeString()}</div>
        </div>
      </div>

      {signal.resolved && signal.resolutionPrice > 0 && (
        <div className={`rounded-lg p-5 sm:p-6 ${
          signal.outcome === 'correct'
            ? 'bg-emerald-900/10 border border-emerald-800/40'
            : 'bg-red-900/10 border border-red-800/40'
        }`}>
          <h3 className="font-semibold mb-3">Resolution Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Entry Price:</span>{' '}
              <span className="font-medium">${formatPrice(signal.entryPrice)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Resolution Price:</span>{' '}
              <span className="font-medium">${formatPrice(signal.resolutionPrice)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Price Change:</span>{' '}
              <span className={`font-bold ${
                signal.resolutionPrice >= signal.entryPrice ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {signal.resolutionPrice >= signal.entryPrice ? '+' : ''}
                {(((signal.resolutionPrice - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5 sm:p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          On-Chain Verification
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Every signal is stored as an immutable Solana account. Click any link to verify independently on Solscan.
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-zinc-500">Signal Account</span>
            <a
              href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-mono text-xs sm:text-sm break-all"
            >
              {signal.publicKey} →
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-zinc-500">Agent Wallet</span>
            <a
              href={`https://solscan.io/account/${signal.agent}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-mono text-xs sm:text-sm break-all"
            >
              {signal.agent} →
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-zinc-500">Program ID</span>
            <a
              href="https://solscan.io/account/6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-mono text-xs sm:text-sm break-all"
            >
              6TtRYm...7dXp →
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-zinc-500">Reasoning Hash</span>
            <span className="font-mono text-zinc-400 text-xs break-all">
              {signal.reasoningHash}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-lg p-5 sm:p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>🔐</span> Why Trust This Signal?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Published on-chain before the outcome — no cherry-picking</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Resolved by Pyth oracle price feed — tamper-proof</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Immutable Solana account — cannot be deleted or modified</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Agent track record is public and verifiable on-chain</span>
          </div>
        </div>
      </div>
    </div>
  );
}
