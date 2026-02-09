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

  // Countdown timer
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

  // Progress toward target (for long: how far from entry to target; for short: reversed)
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
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Signals', href: '/#signals' },
        { label: `${signal.asset} #${signal.index}` },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">
            {signal.direction === 'long' ? '📈' : '📉'}
          </span>
          <div>
            <h1 className="text-3xl font-bold">{signal.asset}</h1>
            <p className="text-zinc-400">
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

      {/* Status + Outcome bar */}
      <div className={`rounded-lg p-4 flex items-center justify-between ${
        signal.outcome === 'correct'
          ? 'bg-emerald-900/20 border border-emerald-700/50 text-emerald-200'
          : signal.outcome === 'incorrect'
          ? 'bg-red-900/20 border border-red-700/50 text-red-200'
          : isExpired
          ? 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-200'
          : 'bg-blue-900/20 border border-blue-700/50 text-blue-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${
            signal.outcome === 'correct' ? 'bg-emerald-500' :
            signal.outcome === 'incorrect' ? 'bg-red-500' :
            isExpired ? 'bg-yellow-500 badge-pulse' : 'bg-blue-500 badge-pulse'
          }`}></span>
          <span className="font-medium">
            {signal.outcome === 'pending'
              ? isExpired ? 'Awaiting Resolution' : 'Active'
              : signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)}
          </span>
        </div>
        <div className="text-sm font-mono">
          {isExpired ? 'Expired' : countdown}
        </div>
      </div>

      {/* Live price + P&L */}
      {currentPrice && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-500">Current Price</div>
              <div className="text-3xl font-bold">${formatPrice(currentPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Unrealized P&L</div>
              <div className={`text-3xl font-bold ${pnl && pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnl !== null ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%' : '...'}
              </div>
            </div>
          </div>
          {/* Progress bar toward target */}
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

      {/* Signal Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Confidence</div>
          <div className="text-2xl font-bold">{signal.confidence}%</div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${signal.confidence}%` }}></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Entry Price</div>
          <div className="text-2xl font-bold">${formatPrice(signal.entryPrice)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Target Price</div>
          <div className="text-2xl font-bold text-emerald-400">
            ${formatPrice(signal.targetPrice)}
          </div>
          <div className="text-xs text-emerald-400/70">+{targetPct}%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Stop Loss</div>
          <div className="text-2xl font-bold text-red-400">
            ${formatPrice(signal.stopLoss)}
          </div>
          <div className="text-xs text-red-400/70">{stopPct}%</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Created</div>
          <div className="text-lg font-medium">{new Date(signal.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-zinc-500">{new Date(signal.createdAt).toLocaleTimeString()}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-500">Expires</div>
          <div className="text-lg font-medium">{new Date(signal.timeHorizon).toLocaleDateString()}</div>
          <div className="text-xs text-zinc-500">{new Date(signal.timeHorizon).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Resolution info (if resolved) */}
      {signal.resolved && (
        <div className={`rounded-lg p-6 ${
          signal.outcome === 'correct'
            ? 'bg-emerald-900/20 border border-emerald-700/50'
            : 'bg-red-900/20 border border-red-700/50'
        }`}>
          <h3 className="font-semibold mb-3">Resolution</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Outcome:</span>{' '}
              <span className={`font-bold ${signal.outcome === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                {signal.outcome.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Resolution Price:</span>{' '}
              <span className="font-medium">${formatPrice(signal.resolutionPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* On-chain verification links */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="font-semibold mb-3">On-Chain Verification</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Signal Account</span>
            <a
              href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-mono"
            >
              {signal.publicKey.slice(0, 12)}...{signal.publicKey.slice(-8)} &rarr;
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Agent Wallet</span>
            <a
              href={`https://solscan.io/account/${signal.agent}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-mono"
            >
              {signal.agent.slice(0, 12)}...{signal.agent.slice(-8)} &rarr;
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Reasoning Hash</span>
            <span className="font-mono text-zinc-400 text-xs">
              {signal.reasoningHash.slice(0, 16)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
