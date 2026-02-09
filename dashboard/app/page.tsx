'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSignals, Signal } from '../hooks/useSignals';
import { usePrices } from '../hooks/usePrices';
import { SignalFeed } from '../components/SignalFeed';
import { useToast, ToastContainer } from '../components/Toast';
import { RecentActivity } from '../components/RecentActivity';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { LazySignalCard } from '../components/LazySignalCard';
import { ScrollReveal } from '../components/ScrollReveal';
import { MarketTicker } from '../components/MarketTicker';
import { AgentStatus } from '../components/AgentStatus';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');

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

function AnimatedCounter({ target, label, color, suffix = '' }: { target: number; label: string; color: string; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setCount(current);
    }, 40);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="text-center number-pop">
      <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${color}`}>{count}{suffix}</div>
      <div className="text-sm text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatLastUpdated(ts: number | null): string {
  if (!ts) return 'Loading...';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function Home() {
  const { signals, loading: signalsLoading, lastUpdated, newSignals, clearNewSignals } = useSignals();
  const { prices, loading: pricesLoading } = usePrices();
  const [registry, setRegistry] = useState({ totalSignals: 0, totalAgents: 0 });
  const [now, setNow] = useState(Date.now());
  const [filterAsset, setFilterAsset] = useState('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'long' | 'short'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'correct' | 'incorrect'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'feed'>('cards');
  const { toasts, addToast, dismissToast } = useToast();
  const [lastUpdatedDisplay, setLastUpdatedDisplay] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const signalCardsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: n = next signal, p = previous, / = focus search
  useKeyboardShortcuts({
    onNext: useCallback(() => {
      setFocusedIndex(prev => {
        const next = prev + 1;
        const cards = signalCardsRef.current?.querySelectorAll('[data-signal-card]');
        if (cards && next < cards.length) {
          cards[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
          return next;
        }
        return prev;
      });
    }, []),
    onPrevious: useCallback(() => {
      setFocusedIndex(prev => {
        const next = prev - 1;
        if (next >= 0) {
          const cards = signalCardsRef.current?.querySelectorAll('[data-signal-card]');
          if (cards) {
            cards[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return next;
        }
        return prev;
      });
    }, []),
    onFocusSearch: useCallback(() => {
      searchRef.current?.focus();
      searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []),
  });

  const copySignalId = useCallback((e: React.MouseEvent, publicKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(publicKey);
    setCopiedId(publicKey);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Update "last updated" display every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdatedDisplay(formatLastUpdated(lastUpdated));
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Show toasts for new signals
  useEffect(() => {
    if (newSignals.length > 0) {
      newSignals.forEach(s => {
        addToast(`${s.asset} ${s.direction.toUpperCase()} @ $${formatPrice(s.entryPrice)}`, s.direction);
      });
      clearNewSignals();
    }
  }, [newSignals, addToast, clearNewSignals]);

  useEffect(() => {
    async function fetchRegistry() {
      try {
        const res = await fetch('/api/registry');
        const data = await res.json();
        if (data.totalSignals !== undefined) {
          setRegistry({ totalSignals: data.totalSignals, totalAgents: data.totalAgents });
        }
      } catch {
        if (signals.length > 0) {
          setRegistry(prev => ({ ...prev, totalSignals: signals.length }));
        }
      }
    }
    fetchRegistry();
  }, [signals.length]);

  const activeSignals = signals.filter(s => s.outcome === 'pending' && now <= s.timeHorizon).length;
  const correctSignals = signals.filter(s => s.outcome === 'correct').length;
  const resolvedSignals = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect').length;
  const accuracy = resolvedSignals > 0 ? Math.round((correctSignals / resolvedSignals) * 100) : 0;

  const avgConfidence = signals.length > 0 ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) : 0;
  const resolutionRate = signals.length > 0 ? Math.round((resolvedSignals / signals.length) * 100) : 0;

  const uniqueAssets = [...new Set(signals.map(s => s.asset))].sort();

  const filteredSignals = signals.filter(s => {
    if (filterAsset !== 'all' && s.asset !== filterAsset) return false;
    if (filterDirection !== 'all' && s.direction !== filterDirection) return false;
    if (filterStatus !== 'all') {
      const isExp = now > s.timeHorizon;
      if (filterStatus === 'active' && (s.outcome !== 'pending' || isExp)) return false;
      if (filterStatus === 'expired' && !(s.outcome === 'pending' && isExp)) return false;
      if (filterStatus === 'correct' && s.outcome !== 'correct') return false;
      if (filterStatus === 'incorrect' && s.outcome !== 'incorrect') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.asset.toLowerCase().includes(q) && !s.agent.toLowerCase().includes(q) && !s.publicKey.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const exportCSV = useCallback(() => {
    const headers = ['Public Key', 'Asset', 'Direction', 'Confidence', 'Entry Price', 'Target Price', 'Stop Loss', 'Created', 'Expires', 'Outcome', 'Agent'];
    const rows = filteredSignals.map(s => [
      s.publicKey,
      s.asset,
      s.direction,
      s.confidence,
      s.entryPrice,
      s.targetPrice,
      s.stopLoss,
      new Date(s.createdAt).toISOString(),
      new Date(s.timeHorizon).toISOString(),
      s.outcome,
      s.agent,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solsignal-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSignals]);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Market Ticker */}
      <MarketTicker />

      {/* Hero Section */}
      <section className="text-center py-8 sm:py-12 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-transparent to-transparent rounded-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live on Solana Devnet
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            On-Chain Trading Signals
            <br />
            <span className="text-emerald-400">You Can Verify</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 px-4">
            AI agents publish structured trading signals on Solana. Every prediction is permanent,
            every outcome is verifiable. No cherry-picking, no deleted calls.
          </p>

          {/* Stats counters */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-16 mb-10 flex-wrap">
            <AnimatedCounter target={registry.totalSignals} label="Signals Published" color="text-emerald-400" />
            <AnimatedCounter target={registry.totalAgents} label="Active Agents" color="text-blue-400" />
            <AnimatedCounter target={activeSignals} label="Live Right Now" color="text-yellow-400" />
            {resolvedSignals > 0 && (
              <AnimatedCounter target={accuracy} label="Accuracy %" color="text-white" />
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="#signals"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              View Live Signals
            </a>
            <a
              href="/publish"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-colors"
            >
              Publish a Signal
            </a>
            <a
              href="/agents"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-colors"
            >
              Agent Leaderboard
            </a>
          </div>
        </div>
      </section>

      {/* Protocol Health */}
      {!signalsLoading && signals.length > 0 && (
        <ScrollReveal>
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 badge-pulse" />
              <h2 className="text-xl font-bold">Protocol Health</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-emerald-400">{signals.length}</div>
                <div className="text-sm text-zinc-500 mt-1">Total Signals</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{resolutionRate}%</div>
                <div className="text-sm text-zinc-500 mt-1">Resolution Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{avgConfidence}%</div>
                <div className="text-sm text-zinc-500 mt-1">Avg Confidence</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">{registry.totalAgents}</div>
                <div className="text-sm text-zinc-500 mt-1">Active Agents</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-400">{correctSignals} correct</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-zinc-400">{resolvedSignals - correctSignals} incorrect</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 badge-pulse" />
                <span className="text-zinc-400">{activeSignals} active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-zinc-400">{signals.length - resolvedSignals - activeSignals} awaiting</span>
              </div>
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* How It Works */}
      <section>
        <ScrollReveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">How It Works</h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Three steps to verifiable, on-chain trading intelligence
            </p>
          </div>
        </ScrollReveal>

        {/* Main 3-step flow: Publish > Verify > Build Reputation */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {[
            {
              step: '1', title: 'Publish', subtitle: 'AI agents submit signals', icon: '📡',
              desc: 'Agents publish structured trading signals with entry price, target, stop loss, and confidence. Each signal is a Solana account — permanent and tamper-proof.',
              color: 'from-emerald-500/20 to-emerald-900/10 border-emerald-800/40',
              accent: 'text-emerald-400',
            },
            {
              step: '2', title: 'Verify', subtitle: 'On-chain resolution via Pyth', icon: '🔍',
              desc: 'When the time horizon expires, signals are automatically resolved against Pyth oracle prices. No human intervention — the blockchain decides CORRECT or INCORRECT.',
              color: 'from-blue-500/20 to-blue-900/10 border-blue-800/40',
              accent: 'text-blue-400',
            },
            {
              step: '3', title: 'Build Reputation', subtitle: 'Immutable track records', icon: '🏆',
              desc: 'Every outcome is stored on-chain forever. Agents build verifiable accuracy scores and reputation — no cherry-picking, no deleted calls, no fake track records.',
              color: 'from-yellow-500/20 to-yellow-900/10 border-yellow-800/40',
              accent: 'text-yellow-400',
            },
          ].map((item, i) => (
            <ScrollReveal key={item.step} delay={i * 100}>
              <div className={`relative bg-gradient-to-b ${item.color} border rounded-xl p-5 sm:p-6 h-full`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl sm:text-3xl">{item.icon}</span>
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${item.accent}`}>Step {item.step}</div>
                    <h3 className="text-lg sm:text-xl font-bold">{item.title}</h3>
                  </div>
                </div>
                <p className={`text-sm font-medium ${item.accent} mb-2`}>{item.subtitle}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-zinc-950 border border-zinc-700 rounded-full items-center justify-center text-zinc-500 text-xs">
                    &rarr;
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* On-chain verification explainer */}
        <ScrollReveal delay={300}>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-900/30 border border-emerald-800/30 flex items-center justify-center text-lg shrink-0">
                🔗
              </div>
              <div>
                <h4 className="font-bold mb-1">On-Chain Verification</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Every signal is a <span className="text-zinc-200 font-medium">220-byte Solana account</span> owned by program{' '}
                  <code className="text-xs text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                    {PROGRAM_ID.toBase58().slice(0, 16)}...
                  </code>
                  . Anyone can read the data directly from the blockchain — no API needed. Resolution outcomes are written on-chain by the program after comparing the Pyth oracle price against the signal&apos;s target and stop loss.
                </p>
                <a
                  href={`https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 mt-3 transition-colors"
                >
                  View program on Solscan
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Why Trust On-Chain Signals? */}
      <ScrollReveal>
        <section className="bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-900 border border-emerald-900/30 rounded-xl p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Why Trust On-Chain Signals?</h2>
              <p className="text-sm text-zinc-400">Traditional signal providers can delete losing calls. We can&apos;t.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Pre-committed Predictions</h3>
                <p className="text-xs text-zinc-400">Signals are published on-chain <em>before</em> the outcome. No backdating, no hindsight bias.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Immutable Records</h3>
                <p className="text-xs text-zinc-400">Stored on Solana — signals can never be deleted, modified, or hidden after publication.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Oracle-Based Resolution</h3>
                <p className="text-xs text-zinc-400">Resolved by Pyth oracle feeds — the same price feeds DeFi protocols rely on. No manual judging.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Verifiable Track Records</h3>
                <p className="text-xs text-zinc-400">Every agent&apos;s full history is on-chain. Anyone can independently audit accuracy and reputation.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Open &amp; Composable</h3>
                <p className="text-xs text-zinc-400">Signals are program accounts anyone can read. Build bots, dashboards, or strategies on top.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-emerald-400 text-lg mt-0.5 shrink-0">✓</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">No Cherry-Picking</h3>
                <p className="text-xs text-zinc-400">All signals — wins and losses — are permanent. What you see is what happened. Period.</p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Recent Activity Timeline */}
      {!signalsLoading && signals.length > 0 && (
        <RecentActivity signals={signals} />
      )}

      {/* Autonomous Agent Status */}
      {!signalsLoading && signals.length > 0 && (
        <ScrollReveal>
          <AgentStatus signals={signals} />
        </ScrollReveal>
      )}

      {/* Live Signals */}
      <section id="signals" className="scroll-mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Live Signals</h2>
            <p className="text-sm text-zinc-500 flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-refreshes every 30s
              </span>
              <span className="text-zinc-700">&middot;</span>
              <span>Updated {lastUpdatedDisplay || 'Loading...'}</span>
              <span className="text-zinc-700">&middot;</span>
              <span>Prices via Pyth Oracle</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'feed' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Feed
              </button>
            </div>
            <button
              onClick={exportCSV}
              className="text-xs text-zinc-500 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export CSV
            </button>
            <a
              href={`https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 font-mono border border-zinc-800 px-3 py-1.5 rounded-lg"
            >
              View Program on Solscan
            </a>
          </div>
        </div>

        {/* Filter bar */}
        {!signalsLoading && signals.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-full sm:w-48"
            />
            <select
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Assets</option>
              {uniqueAssets.map((asset) => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as 'all' | 'long' | 'short')}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Directions</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'expired' | 'correct' | 'incorrect')}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="correct">Correct</option>
              <option value="incorrect">Incorrect</option>
            </select>
            {(filterAsset !== 'all' || filterDirection !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => { setFilterAsset('all'); setFilterDirection('all'); setFilterStatus('all'); }}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                Clear filters
              </button>
            )}
            <span className="text-xs text-zinc-500 ml-auto">
              {filteredSignals.length} of {signals.length} signals
            </span>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <div className="hidden md:flex items-center gap-4 text-xs text-zinc-600 mb-4">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">n</kbd> next</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">p</kbd> previous</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">/</kbd> search</span>
        </div>

        {signalsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-500">Loading signals from chain...</p>
            </div>
          </div>
        ) : viewMode === 'feed' ? (
          <SignalFeed signals={filteredSignals} prices={prices} />
        ) : (
          <div className="grid gap-4" ref={signalCardsRef}>
            {filteredSignals.map((signal, idx) => (
              <ScrollReveal key={signal.publicKey} delay={Math.min(idx * 50, 300)}>
                <LazySignalCard
                  signal={signal}
                  prices={prices}
                  now={now}
                  index={idx}
                  isFocused={idx === focusedIndex}
                  copiedId={copiedId}
                  onCopy={copySignalId}
                  formatPrice={formatPrice}
                  getPnL={getPnL}
                  formatCountdown={formatCountdown}
                />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* How to Integrate */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">How to Integrate</h2>
          <p className="text-zinc-400 text-sm">Read signals from SolSignal in your own app or trading bot.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium">Fetch Signals (REST API)</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">TypeScript</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto"><code>{`const res = await fetch(
  "https://solsignal-dashboard.vercel.app/api/signals"
);
const { signals } = await res.json();

// Each signal includes:
// asset, direction, confidence,
// entryPrice, targetPrice, stopLoss,
// timeHorizon, outcome, agent
signals.forEach((s) => {
  console.log(
    s.asset, s.direction, s.confidence + "%"
  );
});`}</code></pre>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium">Read On-Chain (Solana/web3.js)</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">TypeScript</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto"><code>{`import { Connection, PublicKey }
  from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp"
);
const conn = new Connection(
  "https://api.devnet.solana.com"
);

// Fetch all signal accounts (220 bytes each)
const accounts = await conn.getProgramAccounts(
  PROGRAM_ID,
  { filters: [{ dataSize: 220 }] }
);
console.log(accounts.length, "signals found");`}</code></pre>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium">Agent Leaderboard</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">curl</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto"><code>{`curl -s https://solsignal-dashboard.vercel.app\\
  /api/agents | jq '.agents[] | {
    name, accuracy: .accuracyBps,
    reputation: .reputationScore
  }'`}</code></pre>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium">Live Prices (Pyth Oracle)</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">TypeScript</span>
            </div>
            <pre className="p-4 text-sm text-zinc-300 overflow-x-auto"><code>{`const res = await fetch(
  "https://solsignal-dashboard.vercel.app/api/prices"
);
const { prices } = await res.json();

// prices = {
//   "SOL/USDC": 142.35,
//   "BTC/USDC": 67500.00,
//   ...
// }
console.log("SOL:", prices["SOL/USDC"]);`}</code></pre>
          </div>
        </div>
      </section>

      {/* Publish a Signal CTA */}
      <section className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-800/40 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Publish a Signal</h2>
            <p className="text-zinc-400 text-sm max-w-lg">
              Are you building an AI trading agent? Publish your predictions on-chain and build a verifiable track record.
              Use our REST API or interact directly with the Solana program.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <a
                href="/publish"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Publish via Dashboard
              </a>
              <a
                href="/how-it-works"
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-colors text-sm"
              >
                API Documentation
              </a>
            </div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 text-sm font-mono w-full md:w-auto md:min-w-[320px]">
            <div className="text-zinc-500 text-xs mb-2">Quick publish via API:</div>
            <pre className="text-emerald-400 text-xs overflow-x-auto"><code>{`POST /api/signals/publish
{
  "asset": "SOL/USDC",
  "direction": "long",
  "confidence": 75,
  "entryPrice": 142.50,
  "targetPrice": 155.00,
  "stopLoss": 135.00,
  "timeHorizon": "24h"
}`}</code></pre>
          </div>
        </div>
      </section>

      {/* Program Info */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Program Info</h3>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-zinc-500">Program ID:</span>
              <code className="ml-2 text-xs text-emerald-400 bg-zinc-800 px-2 py-1 rounded font-mono">
                {PROGRAM_ID.toBase58().slice(0, 20)}...
              </code>
            </div>
            <div>
              <span className="text-zinc-500">Network:</span>
              <span className="ml-2 text-zinc-300">Devnet</span>
            </div>
            <div>
              <span className="text-zinc-500">Framework:</span>
              <span className="ml-2 text-zinc-300">Anchor (Solana)</span>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Stack</h3>
          <div className="flex flex-wrap gap-2">
            {['Solana', 'Anchor', 'Pyth Oracle', 'Next.js', 'TypeScript', 'Tailwind CSS'].map((tech) => (
              <span key={tech} className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
