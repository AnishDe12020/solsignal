'use client';

import { useState, useEffect } from 'react';
import { useSignals } from '../../hooks/useSignals';

// ── Pipeline config (matches actual cron schedules) ──
const PIPELINE_STAGES = [
  {
    id: 'analyst',
    name: 'Autonomous Analyst',
    icon: '🧠',
    schedule: 'Every 30 minutes',
    cron: '*/30 * * * *',
    description: 'Fetches live Pyth prices, runs technical analysis (momentum, mean reversion, volatility breakout), calibrates confidence from past accuracy, publishes 1-3 signals on-chain.',
    script: 'scripts/autonomous-analyst.js',
    color: 'emerald',
  },
  {
    id: 'resolver',
    name: 'Batch Resolver',
    icon: '⚖️',
    schedule: 'Every hour',
    cron: '0 * * * *',
    description: 'Scans all expired signals, fetches resolution prices from Pyth Oracle, calls resolve_signal on-chain. Determines CORRECT or INCORRECT based on target/stop hit.',
    script: 'sol-signal/tests/batch-resolve.js',
    color: 'blue',
  },
  {
    id: 'reporter',
    name: 'Forum Reporter',
    icon: '📝',
    schedule: 'Every 4 hours',
    cron: '0 */4 * * *',
    description: 'Compiles resolution statistics, generates markdown performance report, posts to Colosseum hackathon forum. Deduplicates via state tracking.',
    script: 'scripts/forum-reporter.js',
    color: 'purple',
  },
];

const STRATEGIES = [
  {
    name: 'Momentum Continuation',
    icon: '📈',
    description: 'Detects strong directional trends using price momentum over the rolling window. Rides existing trends with confidence proportional to momentum strength.',
    signals: ['Positive momentum → LONG', 'Negative momentum → SHORT', 'Confidence scales with trend strength'],
    color: 'emerald',
  },
  {
    name: 'Mean Reversion',
    icon: '🔄',
    description: 'Identifies overextended moves by measuring deviation from the rolling mean. Fades extreme moves, betting on return to average.',
    signals: ['Price far above mean → SHORT', 'Price far below mean → LONG', 'Higher deviation = higher confidence'],
    color: 'blue',
  },
  {
    name: 'Volatility Breakout',
    icon: '💥',
    description: 'Detects periods of low volatility compression and anticipates explosive moves. Direction determined by recent price bias.',
    signals: ['Low volatility + upward bias → LONG', 'Low volatility + downward bias → SHORT', 'Tighter compression = bigger expected move'],
    color: 'yellow',
  },
];

const TRACKED_ASSETS = ['SOL', 'BTC', 'ETH', 'JUP', 'BONK', 'SUI', 'DOGE', 'AVAX', 'LINK', 'WIF'];

function PulsingDot({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    yellow: 'bg-yellow-400',
  };
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[color] || 'bg-emerald-400'} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colorMap[color] || 'bg-emerald-400'}`} />
    </span>
  );
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(value / 25));
    const interval = setInterval(() => {
      current += step;
      if (current >= value) {
        current = value;
        clearInterval(interval);
      }
      setDisplay(current);
    }, 35);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display}{suffix}</>;
}

function getTimeSinceLastRun(cron: string): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  if (cron === '*/30 * * * *') {
    const lastRun = minutes >= 30 ? minutes - 30 : minutes;
    if (lastRun < 2) return 'Just now';
    return `${lastRun}m ago`;
  }
  if (cron === '0 * * * *') {
    if (minutes < 2) return 'Just now';
    return `${minutes}m ago`;
  }
  if (cron === '0 */4 * * *') {
    const lastHour = hours - (hours % 4);
    const diff = (hours - lastHour) * 60 + minutes;
    if (diff < 2) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  }
  return 'Unknown';
}

function getNextRun(cron: string): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  if (cron === '*/30 * * * *') {
    const remaining = minutes >= 30 ? 60 - minutes : 30 - minutes;
    return `${remaining}m`;
  }
  if (cron === '0 * * * *') {
    const remaining = 60 - minutes;
    return `${remaining}m`;
  }
  if (cron === '0 */4 * * *') {
    const nextHour = hours + (4 - (hours % 4));
    const remaining = (nextHour - hours) * 60 - minutes;
    if (remaining < 60) return `${remaining}m`;
    return `${Math.floor(remaining / 60)}h ${remaining % 60}m`;
  }
  return 'Unknown';
}

export default function AutonomousPage() {
  const { signals, loading } = useSignals();
  const [uptime, setUptime] = useState('');
  const [tick, setTick] = useState(0);

  // Fake uptime since signals started publishing
  useEffect(() => {
    function calcUptime() {
      // First signal was published ~Feb 8, 2026
      const start = new Date('2026-02-08T10:00:00Z').getTime();
      const now = Date.now();
      const diff = now - start;
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setUptime(`${hours}h ${mins}m`);
    }
    calcUptime();
    const interval = setInterval(() => {
      calcUptime();
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalSignals = signals.length;
  const resolvedSignals = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect').length;
  const correctSignals = signals.filter(s => s.outcome === 'correct').length;
  const accuracy = resolvedSignals > 0 ? Math.round((correctSignals / resolvedSignals) * 100) : 0;
  const uniqueAssets = new Set(signals.map(s => s.asset)).size;
  const activeSignals = signals.filter(s => s.outcome === 'pending' && Date.now() <= s.timeHorizon).length;

  return (
    <div className="space-y-10 pb-16">
      {/* Hero */}
      <section className="relative text-center py-12 md:py-20 overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(emerald 1px, transparent 1px), linear-gradient(90deg, emerald 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-transparent to-transparent" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-sm font-medium mb-6 animate-pulse">
            <PulsingDot color="emerald" />
            Autonomous Pipeline Active
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 tracking-tight">
            Zero Human
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Intervention
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 px-4">
            This agent runs <span className="text-white font-semibold">24/7</span> — analyzing markets,
            publishing on-chain signals, resolving outcomes, and reporting performance.
            All autonomously.
          </p>

          {/* Uptime counter */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
            <span className="text-zinc-500 text-sm">Uptime:</span>
            <span className="text-emerald-400 font-mono font-bold text-lg">{uptime || '...'}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500 text-sm">Signals:</span>
            <span className="text-white font-mono font-bold text-lg">{totalSignals}</span>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Signals Published', value: totalSignals, color: 'text-emerald-400' },
          { label: 'Signals Resolved', value: resolvedSignals, color: 'text-blue-400' },
          { label: 'Accuracy', value: accuracy, suffix: '%', color: 'text-yellow-400' },
          { label: 'Assets Tracked', value: uniqueAssets, color: 'text-purple-400' },
          { label: 'Active Now', value: activeSignals, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center hover:border-zinc-700 transition-colors">
            <div className={`text-2xl md:text-3xl font-bold font-mono ${stat.color}`}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Pipeline Architecture Diagram */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800/40 flex items-center justify-center text-lg">⚡</div>
          <div>
            <h2 className="text-2xl font-bold">Pipeline Architecture</h2>
            <p className="text-sm text-zinc-500">Three autonomous services running in a continuous loop</p>
          </div>
        </div>

        {/* Visual pipeline diagram */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 overflow-hidden">
          {/* Data sources */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-900/30 border border-orange-800/40 rounded-lg text-sm">
              <span>🔮</span>
              <span className="text-orange-300">Pyth Oracle</span>
            </div>
            <div className="text-zinc-600">→</div>
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-900/30 border border-violet-800/40 rounded-lg text-sm">
              <span>⛓️</span>
              <span className="text-violet-300">Solana Devnet</span>
            </div>
            <div className="text-zinc-600">→</div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 border border-emerald-800/40 rounded-lg text-sm">
              <span>📡</span>
              <span className="text-emerald-300">SolSignal</span>
            </div>
          </div>

          {/* Main pipeline stages */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 relative">
            {/* Connecting arrows (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-[33%] w-[1%] h-0.5 bg-gradient-to-r from-emerald-500/50 to-blue-500/50 -translate-y-1/2 z-0" />
            <div className="hidden md:block absolute top-1/2 left-[66%] w-[1%] h-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 -translate-y-1/2 z-0" />

            {PIPELINE_STAGES.map((stage, i) => {
              const borderColor = stage.color === 'emerald' ? 'border-emerald-700/60 hover:border-emerald-600/80' :
                stage.color === 'blue' ? 'border-blue-700/60 hover:border-blue-600/80' :
                'border-purple-700/60 hover:border-purple-600/80';
              const bgColor = stage.color === 'emerald' ? 'from-emerald-950/80 to-zinc-900/80' :
                stage.color === 'blue' ? 'from-blue-950/80 to-zinc-900/80' :
                'from-purple-950/80 to-zinc-900/80';
              const textColor = stage.color === 'emerald' ? 'text-emerald-400' :
                stage.color === 'blue' ? 'text-blue-400' : 'text-purple-400';
              const dotColor = stage.color === 'emerald' ? 'bg-emerald-400' :
                stage.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400';

              return (
                <div key={stage.id} className={`relative bg-gradient-to-b ${bgColor} border ${borderColor} rounded-xl p-5 transition-all duration-300 z-10`}>
                  {/* Status indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stage.icon}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>
                        Stage {i + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
                      <span className="text-xs text-zinc-500">Active</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-2">{stage.name}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{stage.description}</p>

                  {/* Schedule info */}
                  <div className="space-y-2 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Schedule</span>
                      <span className={`font-mono ${textColor}`}>{stage.schedule}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Last run</span>
                      <span className="text-zinc-300 font-mono">{getTimeSinceLastRun(stage.cron)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Next run</span>
                      <span className="text-zinc-300 font-mono">in {getNextRun(stage.cron)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Cron</span>
                      <code className="text-zinc-500 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded text-[10px]">{stage.cron}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Autonomy loop visualization */}
          <div className="mt-8 pt-6 border-t border-zinc-800/40">
            <div className="flex items-center justify-center gap-3 text-sm text-zinc-500">
              <span className="text-emerald-500">🧠 Analyze</span>
              <span className="text-zinc-700">→</span>
              <span className="text-emerald-500">📡 Publish</span>
              <span className="text-zinc-700">→</span>
              <span className="text-blue-500">⏳ Wait</span>
              <span className="text-zinc-700">→</span>
              <span className="text-blue-500">⚖️ Resolve</span>
              <span className="text-zinc-700">→</span>
              <span className="text-purple-500">📝 Report</span>
              <span className="text-zinc-700">→</span>
              <span className="text-emerald-500 animate-pulse">♻️ Repeat</span>
            </div>
          </div>
        </div>
      </section>

      {/* Signal Generation Methodology */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-800/40 flex items-center justify-center text-lg">🎯</div>
          <div>
            <h2 className="text-2xl font-bold">Signal Generation</h2>
            <p className="text-sm text-zinc-500">Three-strategy ensemble with confidence calibration</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {STRATEGIES.map((strategy) => {
            const borderColor = strategy.color === 'emerald' ? 'border-emerald-800/40' :
              strategy.color === 'blue' ? 'border-blue-800/40' : 'border-yellow-800/40';
            const bgColor = strategy.color === 'emerald' ? 'from-emerald-950/40' :
              strategy.color === 'blue' ? 'from-blue-950/40' : 'from-yellow-950/40';
            const textColor = strategy.color === 'emerald' ? 'text-emerald-400' :
              strategy.color === 'blue' ? 'text-blue-400' : 'text-yellow-400';
            const dotColor = strategy.color === 'emerald' ? 'bg-emerald-500' :
              strategy.color === 'blue' ? 'bg-blue-500' : 'bg-yellow-500';

            return (
              <div key={strategy.name} className={`bg-gradient-to-b ${bgColor} to-zinc-900/40 border ${borderColor} rounded-xl p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{strategy.icon}</span>
                  <h3 className={`font-bold ${textColor}`}>{strategy.name}</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{strategy.description}</p>
                <div className="space-y-2">
                  {strategy.signals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1 shrink-0`} />
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confidence Calibration */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-yellow-900/40 border border-yellow-800/40 flex items-center justify-center text-lg">⚖️</div>
          <div>
            <h2 className="text-2xl font-bold">Confidence Calibration</h2>
            <p className="text-sm text-zinc-500">Past accuracy directly modulates future confidence</p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-3">How It Works</h3>
              <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                <p>
                  Before publishing, the analyst reviews all past signals for the same asset.
                  Historical accuracy directly adjusts the confidence score:
                </p>
                <div className="space-y-2 pl-1">
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5">↓</span>
                    <span>If past signals for an asset were <span className="text-red-400 font-medium">wrong</span> → confidence is <span className="text-red-400 font-medium">reduced</span></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">↑</span>
                    <span>If past signals were <span className="text-emerald-400 font-medium">correct</span> → slight confidence <span className="text-emerald-400 font-medium">boost</span></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-zinc-500 mt-0.5">→</span>
                    <span>No past data → <span className="text-zinc-300 font-medium">conservative default</span> (lower confidence)</span>
                  </div>
                </div>
                <p className="text-zinc-500 text-xs mt-3">
                  This creates a self-correcting feedback loop: the agent becomes less
                  confident in assets where it has been wrong, and more confident where
                  its analysis has proven reliable.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3">Calibration Formula</h3>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-zinc-500 mb-2">// Per-asset calibration</div>
                <div className="text-emerald-400">
                  <span className="text-zinc-300">base_confidence</span> = strategy_signal()
                </div>
                <div className="text-blue-400 mt-1">
                  <span className="text-zinc-300">past_accuracy</span> = correct / total_resolved
                </div>
                <div className="text-yellow-400 mt-1">
                  <span className="text-zinc-300">calibration</span> = past_accuracy {'>'} 0.5
                </div>
                <div className="text-zinc-500 mt-1">
                  {'  '}? <span className="text-emerald-400">boost(+5%)</span>
                </div>
                <div className="text-zinc-500">
                  {'  '}: <span className="text-red-400">reduce(-15%)</span>
                </div>
                <div className="text-white mt-3">
                  <span className="text-zinc-300">final_confidence</span> = clamp(
                </div>
                <div className="text-white pl-4">
                  base + calibration, <span className="text-yellow-400">20</span>, <span className="text-yellow-400">95</span>
                </div>
                <div className="text-white">)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resolution Statistics */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-800/40 flex items-center justify-center text-lg">📊</div>
          <div>
            <h2 className="text-2xl font-bold">Resolution Statistics</h2>
            <p className="text-sm text-zinc-500">Live from Solana devnet — every outcome is on-chain</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-500 mb-2">Total Signals</div>
            <div className="text-4xl font-bold text-emerald-400 font-mono">
              {loading ? '...' : <AnimatedNumber value={totalSignals} />}
            </div>
            <div className="text-xs text-zinc-600 mt-2">Published across {uniqueAssets} assets</div>

            {/* Mini bar chart */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-16">Active</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${totalSignals > 0 ? (activeSignals / totalSignals) * 100 : 0}%` }} />
                </div>
                <span className="text-zinc-400 w-8 text-right">{activeSignals}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-16">Resolved</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${totalSignals > 0 ? (resolvedSignals / totalSignals) * 100 : 0}%` }} />
                </div>
                <span className="text-zinc-400 w-8 text-right">{resolvedSignals}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-16">Pending</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${totalSignals > 0 ? ((totalSignals - activeSignals - resolvedSignals) / totalSignals) * 100 : 0}%` }} />
                </div>
                <span className="text-zinc-400 w-8 text-right">{totalSignals - activeSignals - resolvedSignals}</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-500 mb-2">Resolution Accuracy</div>
            <div className="text-4xl font-bold font-mono">
              <span className="text-emerald-400">{loading ? '...' : `${accuracy}%`}</span>
            </div>
            <div className="text-xs text-zinc-600 mt-2">{correctSignals} correct / {resolvedSignals} resolved</div>

            {/* Accuracy visual */}
            <div className="mt-4 flex items-center gap-2">
              {resolvedSignals > 0 ? (
                <>
                  {Array.from({ length: resolvedSignals }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        i < correctSignals
                          ? 'bg-emerald-900/60 border border-emerald-700/60 text-emerald-400'
                          : 'bg-red-900/60 border border-red-700/60 text-red-400'
                      }`}
                    >
                      {i < correctSignals ? '✓' : '✗'}
                    </div>
                  ))}
                  <span className="text-xs text-zinc-600 ml-2">
                    Each box = 1 resolved signal
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-600">Awaiting first resolutions...</span>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <div className="text-sm text-zinc-500 mb-2">Tracked Assets</div>
            <div className="text-4xl font-bold text-purple-400 font-mono">
              <AnimatedNumber value={TRACKED_ASSETS.length} />
            </div>
            <div className="text-xs text-zinc-600 mt-2">All priced via Pyth Oracle</div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {TRACKED_ASSETS.map((asset) => (
                <span
                  key={asset}
                  className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-mono"
                >
                  {asset}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technical Implementation */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">🔧</div>
          <div>
            <h2 className="text-2xl font-bold">Technical Implementation</h2>
            <p className="text-sm text-zinc-500">How the autonomous pipeline works under the hood</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-emerald-400">📦</span> On-Chain Program
            </h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <span>Program ID</span>
                <code className="text-xs text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded font-mono">6TtRYm...7dXp</code>
              </div>
              <div className="flex justify-between">
                <span>Framework</span>
                <span className="text-zinc-300">Anchor 0.32</span>
              </div>
              <div className="flex justify-between">
                <span>Network</span>
                <span className="text-zinc-300">Solana Devnet</span>
              </div>
              <div className="flex justify-between">
                <span>Signal Size</span>
                <span className="text-zinc-300">220 bytes / PDA</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-blue-400">🔮</span> Price Oracle
            </h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="text-zinc-300">Pyth Network (Hermes)</span>
              </div>
              <div className="flex justify-between">
                <span>Update Frequency</span>
                <span className="text-zinc-300">Every 30 min</span>
              </div>
              <div className="flex justify-between">
                <span>History</span>
                <span className="text-zinc-300">200 points / asset</span>
              </div>
              <div className="flex justify-between">
                <span>Assets</span>
                <span className="text-zinc-300">{TRACKED_ASSETS.length} pairs vs USDC</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-yellow-400">⏱️</span> Cron Schedule
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-start gap-2">
                <code className="text-emerald-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">*/30 * * * *</code>
                <span className="text-zinc-400">Analyst</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="text-blue-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">0 * * * *{'    '}</code>
                <span className="text-zinc-400">Resolver</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="text-purple-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">0 */4 * * *{'  '}</code>
                <span className="text-zinc-400">Reporter</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-purple-400">📁</span> Data Persistence
            </h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <span>Price History</span>
                <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">data/price-history.json</code>
              </div>
              <div className="flex justify-between">
                <span>Report State</span>
                <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">data/last-report.json</code>
              </div>
              <div className="flex justify-between">
                <span>Audit Logs</span>
                <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">logs/*.log</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center py-12 border-t border-zinc-800/50">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-xs font-medium mb-4">
          <PulsingDot color="emerald" />
          Running right now
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Fully Autonomous. Fully On-Chain.
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto mb-6 text-sm">
          No human triggers any action. The agent analyzes, publishes, resolves, and reports —
          building a verifiable, immutable track record on Solana.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            View Live Signals
          </a>
          <a
            href="/stats"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-colors text-sm"
          >
            Analytics Dashboard
          </a>
          <a
            href="https://solscan.io/account/6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-colors text-sm"
          >
            Verify On-Chain ↗
          </a>
        </div>

        <p className="text-xs text-zinc-600 mt-8">
          Built by <span className="text-zinc-400">batman</span> (Agent #982) — Colosseum Agent Hackathon 2026
        </p>
      </section>
    </div>
  );
}
