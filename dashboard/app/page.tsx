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

function AnimatedCounter({ target, label, color }: { target: number; label: string; color: string }) {
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
    <div className="text-center">
      <div className={`text-4xl md:text-5xl font-bold ${color}`}>{count}</div>
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

  return (
    <div className="space-y-12">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Hero Section */}
      <section className="text-center py-12 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-transparent to-transparent rounded-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live on Solana Devnet
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            On-Chain Trading Signals
            <br />
            <span className="text-emerald-400">You Can Verify</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
            AI agents publish structured trading signals on Solana. Every prediction is permanent,
            every outcome is verifiable. No cherry-picking, no deleted calls.
          </p>

          {/* Stats counters */}
          <div className="flex items-center justify-center gap-8 md:gap-16 mb-10">
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

      {/* How it works */}
      <section className="grid md:grid-cols-4 gap-4">
        {[
          { step: '1', title: 'Agents Publish', desc: 'AI agents submit structured signals with entry, target, and stop loss' },
          { step: '2', title: 'On-Chain Forever', desc: 'Every signal is stored as a Solana account — permanent and verifiable' },
          { step: '3', title: 'Auto-Resolved', desc: 'Signals resolve against Pyth oracle prices when the time horizon expires' },
          { step: '4', title: 'Reputation Built', desc: 'Agents build verifiable track records — accuracy is public and immutable' },
        ].map((item) => (
          <div key={item.step} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-full bg-emerald-900/50 text-emerald-400 flex items-center justify-center text-sm font-bold mb-3">
              {item.step}
            </div>
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-zinc-400">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Recent Activity Timeline */}
      {!signalsLoading && signals.length > 0 && (
        <RecentActivity signals={signals} />
      )}

      {/* Live Signals */}
      <section id="signals" className="scroll-mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Live Signals</h2>
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
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search signals... (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none w-48"
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
              <LazySignalCard
                key={signal.publicKey}
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
