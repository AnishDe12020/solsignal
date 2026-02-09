'use client';

import { useState, useEffect } from 'react';
import { Signal, useSignals } from '../../hooks/useSignals';

interface AgentData {
  profilePDA: string;
  authority: string;
  name: string;
  totalSignals: number;
  correctSignals: number;
  incorrectSignals: number;
  expiredSignals: number;
  accuracyBps: number;
  reputationScore: number;
  createdAt: number;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-24 text-sm text-zinc-400 text-right shrink-0">{item.label}</div>
          <div className="flex-1 h-8 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-700 ${item.color}`}
              style={{ width: maxValue > 0 ? `${Math.max(2, (item.value / maxValue) * 100)}%` : '0%' }}
            />
          </div>
          <div className="w-10 text-sm font-medium text-zinc-300 text-right shrink-0">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { signals, loading: signalsLoading } = useSignals();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.agents) setAgents(data.agents);
      } catch {}
      setAgentsLoading(false);
    }
    fetchAgents();
  }, []);

  const loading = signalsLoading || agentsLoading;

  // Compute stats
  const total = signals.length;
  const active = signals.filter(s => s.outcome === 'pending' && Date.now() <= s.timeHorizon).length;
  const expired = signals.filter(s => s.outcome === 'pending' && Date.now() > s.timeHorizon).length;
  const correct = signals.filter(s => s.outcome === 'correct').length;
  const incorrect = signals.filter(s => s.outcome === 'incorrect').length;
  const resolved = correct + incorrect;
  const accuracy = resolved > 0 ? ((correct / resolved) * 100).toFixed(1) : '—';

  const longSignals = signals.filter(s => s.direction === 'long').length;
  const shortSignals = signals.filter(s => s.direction === 'short').length;

  // Asset distribution
  const assetCounts: Record<string, number> = {};
  signals.forEach(s => {
    assetCounts[s.asset] = (assetCounts[s.asset] || 0) + 1;
  });
  const assetData = Object.entries(assetCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: 'bg-emerald-500' }));
  const maxAsset = assetData.length > 0 ? assetData[0].value : 0;

  // Direction distribution
  const directionData = [
    { label: 'Long', value: longSignals, color: 'bg-emerald-500' },
    { label: 'Short', value: shortSignals, color: 'bg-red-500' },
  ];

  // Outcome distribution
  const outcomeData = [
    { label: 'Active', value: active, color: 'bg-blue-500' },
    { label: 'Awaiting', value: expired, color: 'bg-yellow-500' },
    { label: 'Correct', value: correct, color: 'bg-emerald-500' },
    { label: 'Incorrect', value: incorrect, color: 'bg-red-500' },
  ];
  const maxOutcome = Math.max(...outcomeData.map(d => d.value), 1);

  // Time-based: signals by day (last 14 days)
  const now = Date.now();
  const dayMs = 86400000;
  const dayBuckets: { label: string; value: number; color: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = now - i * dayMs;
    const dayEnd = dayStart + dayMs;
    const count = signals.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd).length;
    const date = new Date(dayStart);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    dayBuckets.push({ label, value: count, color: 'bg-emerald-500' });
  }
  const maxDay = Math.max(...dayBuckets.map(d => d.value), 1);

  // Confidence distribution
  const confBuckets = [
    { label: '10-30%', min: 10, max: 30 },
    { label: '31-50%', min: 31, max: 50 },
    { label: '51-70%', min: 51, max: 70 },
    { label: '71-90%', min: 71, max: 90 },
    { label: '91-100%', min: 91, max: 100 },
  ].map(b => ({
    label: b.label,
    value: signals.filter(s => s.confidence >= b.min && s.confidence <= b.max).length,
    color: 'bg-blue-500',
  }));
  const maxConf = Math.max(...confBuckets.map(d => d.value), 1);

  // Agent stats
  const topAgent = agents.length > 0 ? agents.reduce((a, b) => a.reputationScore > b.reputationScore ? a : b) : null;

  // Win rate by agent
  const agentWinRates = agents.map(a => ({
    name: a.name,
    wins: a.correctSignals,
    losses: a.incorrectSignals,
    total: a.totalSignals,
    accuracy: a.totalSignals > 0 ? ((a.correctSignals / Math.max(1, a.correctSignals + a.incorrectSignals)) * 100) : 0,
    reputation: a.reputationScore,
  })).filter(a => a.total > 0).sort((a, b) => b.accuracy - a.accuracy);

  // Performance by asset: correct vs incorrect per asset
  const assetPerformance: Record<string, { correct: number; incorrect: number; total: number }> = {};
  signals.forEach(s => {
    if (!assetPerformance[s.asset]) assetPerformance[s.asset] = { correct: 0, incorrect: 0, total: 0 };
    assetPerformance[s.asset].total++;
    if (s.outcome === 'correct') assetPerformance[s.asset].correct++;
    if (s.outcome === 'incorrect') assetPerformance[s.asset].incorrect++;
  });
  const assetPerfData = Object.entries(assetPerformance)
    .sort((a, b) => b[1].total - a[1].total);
  const maxAssetPerf = Math.max(...assetPerfData.map(([, d]) => d.total), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Protocol Analytics</h1>
        <p className="text-zinc-400">
          Live stats from the SolSignal program on Solana Devnet.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500">Loading analytics from chain...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard label="Total Signals" value={total} color="text-emerald-400" />
            <StatCard label="Active" value={active} sub="Currently live" color="text-blue-400" />
            <StatCard label="Awaiting Resolution" value={expired} color="text-yellow-400" />
            <StatCard label="Resolved" value={resolved} sub={`${correct}W / ${incorrect}L`} color="text-zinc-100" />
            <StatCard label="Accuracy" value={resolved > 0 ? `${accuracy}%` : '—'} sub={resolved > 0 ? `${resolved} resolved` : 'No resolved signals'} color="text-emerald-400" />
            <StatCard label="Agents" value={agents.length} sub={topAgent ? `Top: @${topAgent.name}` : ''} color="text-blue-400" />
          </div>

          {/* Direction + Outcome row */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Signal Direction</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-emerald-400">Long</span>
                    <span className="text-zinc-400">{longSignals}</span>
                  </div>
                  <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: total > 0 ? `${(longSignals / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-400">Short</span>
                    <span className="text-zinc-400">{shortSignals}</span>
                  </div>
                  <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: total > 0 ? `${(shortSignals / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500 text-center">
                {total > 0 ? `${((longSignals / total) * 100).toFixed(0)}% long / ${((shortSignals / total) * 100).toFixed(0)}% short` : 'No signals yet'}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Outcome Distribution</h3>
              <BarChart data={outcomeData} maxValue={maxOutcome} />
            </div>
          </div>

          {/* Asset distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Signals by Asset</h3>
            {assetData.length > 0 ? (
              <BarChart data={assetData} maxValue={maxAsset} />
            ) : (
              <p className="text-zinc-500 text-sm">No signals yet</p>
            )}
          </div>

          {/* Time-based chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Signals Published (Last 14 Days)</h3>
            <div className="flex items-end gap-1 h-40">
              {dayBuckets.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-emerald-500/80 rounded-t transition-all duration-500 min-h-[2px]"
                    style={{ height: `${Math.max(2, (day.value / maxDay) * 100)}%` }}
                  />
                  <div className="text-[10px] text-zinc-500 mt-1 whitespace-nowrap">{day.label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Confidence distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Confidence Distribution</h3>
            <BarChart data={confBuckets} maxValue={maxConf} />
          </div>

          {/* Agent Performance Overview */}
          {resolved > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Agent Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{correct}</div>
                  <div className="text-xs text-zinc-500 mt-1">Wins</div>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-red-400">{incorrect}</div>
                  <div className="text-xs text-zinc-500 mt-1">Losses</div>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-zinc-100">{accuracy}%</div>
                  <div className="text-xs text-zinc-500 mt-1">Win Rate</div>
                </div>
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{expired}</div>
                  <div className="text-xs text-zinc-500 mt-1">Awaiting</div>
                </div>
              </div>
              {/* Win rate bar */}
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Win Rate</span>
                  <span>{accuracy}% ({correct}W / {incorrect}L)</span>
                </div>
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{ width: resolved > 0 ? `${(correct / resolved) * 100}%` : '0%' }}
                  />
                  <div
                    className="h-full bg-red-500 transition-all duration-700"
                    style={{ width: resolved > 0 ? `${(incorrect / resolved) * 100}%` : '0%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>Correct</span>
                  <span>Incorrect</span>
                </div>
              </div>
            </div>
          )}

          {/* Performance by Asset - CSS only bar chart */}
          {assetPerfData.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Performance by Asset</h3>
              <div className="space-y-4">
                {assetPerfData.map(([asset, data]) => {
                  const assetResolved = data.correct + data.incorrect;
                  const assetAccuracy = assetResolved > 0 ? Math.round((data.correct / assetResolved) * 100) : null;
                  return (
                    <div key={asset}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-zinc-200">{asset}</span>
                        <span className="text-zinc-400 text-xs">
                          {data.total} signals
                          {assetAccuracy !== null && (
                            <span className={`ml-2 font-bold ${assetAccuracy >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {assetAccuracy}% win
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-6 bg-zinc-800 rounded overflow-hidden flex">
                        {data.correct > 0 && (
                          <div
                            className="h-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                            style={{ width: `${(data.correct / maxAssetPerf) * 100}%` }}
                          >
                            {data.correct > 0 ? `${data.correct}W` : ''}
                          </div>
                        )}
                        {data.incorrect > 0 && (
                          <div
                            className="h-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                            style={{ width: `${(data.incorrect / maxAssetPerf) * 100}%` }}
                          >
                            {data.incorrect > 0 ? `${data.incorrect}L` : ''}
                          </div>
                        )}
                        <div
                          className="h-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 transition-all duration-700"
                          style={{ width: `${((data.total - data.correct - data.incorrect) / maxAssetPerf) * 100}%` }}
                        >
                          {data.total - data.correct - data.incorrect > 0 ? `${data.total - data.correct - data.incorrect}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Correct</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Incorrect</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-700" /> Pending</span>
              </div>
            </div>
          )}

          {/* Agent Win Rates */}
          {agentWinRates.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Agent Win Rates</h3>
              <div className="space-y-3">
                {agentWinRates.map((agent, idx) => (
                  <div key={agent.name} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-500 w-6 shrink-0">#{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">@{agent.name}</span>
                        <span className={`text-sm font-bold ${agent.accuracy >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {agent.accuracy.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${agent.accuracy}%` }} />
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{agent.wins}W / {agent.losses}L / {agent.total} total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent stats */}
          {agents.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Top Agents by Reputation</h3>
              <div className="space-y-3">
                {agents.slice(0, 5).map((agent, idx) => (
                  <div key={agent.profilePDA} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-500 w-6">#{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">@{agent.name}</div>
                      <div className="text-xs text-zinc-500">{agent.totalSignals} signals &middot; {agent.accuracyBps > 0 ? `${(agent.accuracyBps / 100).toFixed(1)}% accuracy` : 'No resolved'}</div>
                    </div>
                    <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, (agent.reputationScore / (agents[0]?.reputationScore || 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="text-sm font-mono text-emerald-400 w-16 text-right">{agent.reputationScore}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
