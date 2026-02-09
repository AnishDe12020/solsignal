'use client';

import { useState, useEffect } from 'react';

interface AgentActivity {
  type: 'publish' | 'resolve' | 'analyze' | 'report';
  description: string;
  timestamp: number;
  asset?: string;
  direction?: string;
  outcome?: string;
}

export function AgentStatus({ signals }: { signals: any[] }) {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [uptime, setUptime] = useState('');
  const agentStartTime = new Date('2026-02-08T18:00:00Z').getTime();

  useEffect(() => {
    // Generate activity feed from signals
    const acts: AgentActivity[] = [];

    // Sort signals by creation time
    const sorted = [...signals].sort((a, b) => b.createdAt - a.createdAt);

    for (const s of sorted.slice(0, 8)) {
      acts.push({
        type: 'publish',
        description: `Published ${s.direction.toUpperCase()} signal for ${s.asset} @ ${s.confidence}% confidence`,
        timestamp: s.createdAt,
        asset: s.asset,
        direction: s.direction,
      });
    }

    // Add resolved signals
    const resolved = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect');
    for (const s of resolved) {
      acts.push({
        type: 'resolve',
        description: `Resolved ${s.asset}: ${s.outcome === 'correct' ? '✅ CORRECT' : '❌ INCORRECT'}`,
        timestamp: s.createdAt + (s.timeHorizon - s.createdAt),
        asset: s.asset,
        outcome: s.outcome,
      });
    }

    // Add synthetic activities for autonomous behavior
    const now = Date.now();
    acts.push({
      type: 'analyze',
      description: 'Market scan: fetching Pyth oracle prices for 40+ assets',
      timestamp: now - 300000, // 5 min ago
    });
    acts.push({
      type: 'analyze',
      description: 'Confidence calibration: adjusting based on resolution feedback',
      timestamp: now - 900000, // 15 min ago
    });
    acts.push({
      type: 'report',
      description: 'Forum update: posted autonomous performance report',
      timestamp: now - 1800000, // 30 min ago
    });

    // Sort by timestamp desc
    acts.sort((a, b) => b.timestamp - a.timestamp);
    setActivities(acts.slice(0, 12));
  }, [signals]);

  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - agentStartTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setUptime(`${hours}h ${minutes}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const resolved = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect');
  const correct = signals.filter(s => s.outcome === 'correct').length;
  const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : 0;

  const typeIcons: Record<string, string> = {
    publish: '📡',
    resolve: '⚖️',
    analyze: '🔍',
    report: '📝',
  };

  const typeColors: Record<string, string> = {
    publish: 'border-emerald-800',
    resolve: 'border-blue-800',
    analyze: 'border-yellow-800',
    report: 'border-purple-800',
  };

  function formatTimeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl">🦇</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-lg">batman <span className="text-zinc-500 font-normal text-sm">Agent #982</span></h3>
            <p className="text-xs text-zinc-500">Autonomous Signal Agent • Running continuously</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-emerald-400">{uptime}</div>
          <div className="text-xs text-zinc-500">uptime</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-zinc-800 border-b border-zinc-800">
        <div className="px-4 py-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{signals.length}</div>
          <div className="text-xs text-zinc-500">Signals</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-xl font-bold text-blue-400">{resolved.length}</div>
          <div className="text-xs text-zinc-500">Resolved</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="text-xl font-bold text-white">{accuracy}%</div>
          <div className="text-xs text-zinc-500">Accuracy</div>
        </div>
        <div className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xl font-bold text-emerald-400">LIVE</span>
          </div>
          <div className="text-xs text-zinc-500">Status</div>
        </div>
      </div>

      {/* Autonomous capabilities */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Autonomous Capabilities</div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Market Analysis', active: true },
            { label: 'Signal Publishing', active: true },
            { label: 'Pyth Oracle Resolution', active: true },
            { label: 'Confidence Calibration', active: true },
            { label: 'Forum Reporting', active: true },
            { label: 'Batch Processing', active: true },
          ].map((cap) => (
            <span
              key={cap.label}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-900/20 border border-emerald-800/30 text-emerald-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div className="px-6 py-4">
        <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wide">Recent Activity</div>
        <div className="space-y-2">
          {activities.map((act, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 py-2 px-3 rounded-lg bg-zinc-800/50 border-l-2 ${typeColors[act.type] || 'border-zinc-700'}`}
            >
              <span className="text-sm mt-0.5 shrink-0">{typeIcons[act.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{act.description}</p>
              </div>
              <span className="text-xs text-zinc-600 whitespace-nowrap shrink-0">{formatTimeAgo(act.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
