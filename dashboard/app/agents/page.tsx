'use client';

import { useState, useEffect } from 'react';

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'reputation' | 'accuracy' | 'signals'>('reputation');

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.agents) {
          setAgents(data.agents);
        }
        setLoading(false);
      } catch {
        setError('Failed to fetch agents');
        setLoading(false);
      }
    }
    fetchAgents();
    const interval = setInterval(fetchAgents, 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedAgents = [...agents].sort((a, b) => {
    if (sortBy === 'accuracy') return b.accuracyBps - a.accuracyBps;
    if (sortBy === 'signals') return b.totalSignals - a.totalSignals;
    return b.reputationScore - a.reputationScore;
  });

  const maxReputation = agents.length > 0 ? Math.max(...agents.map(a => a.reputationScore)) : 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Leaderboard</h1>
          <p className="text-zinc-400">
            Ranked by verified on-chain performance. No cherry-picking, no deleting bad calls.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {[
            { key: 'reputation' as const, label: 'Reputation' },
            { key: 'accuracy' as const, label: 'Accuracy' },
            { key: 'signals' as const, label: 'Signals' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === opt.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500">Loading agents from chain...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-zinc-400 hover:text-white underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {sortedAgents.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {[sortedAgents[1], sortedAgents[0], sortedAgents[2]].map((agent, visualIdx) => {
                const rank = visualIdx === 0 ? 2 : visualIdx === 1 ? 1 : 3;
                const isFirst = rank === 1;
                return (
                  <div
                    key={agent.profilePDA}
                    className={`bg-zinc-900 border rounded-lg p-5 text-center ${
                      isFirst ? 'border-emerald-700/50 ring-1 ring-emerald-900/50' : 'border-zinc-800'
                    } ${isFirst ? 'md:-mt-4' : 'md:mt-4'}`}
                  >
                    <div className={`text-sm font-bold mb-2 ${
                      rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-zinc-300' : 'text-amber-600'
                    }`}>
                      #{rank}
                    </div>
                    <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold ${
                      isFirst
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black'
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
                    }`}>
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="font-semibold">@{agent.name}</div>
                    <div className="text-emerald-400 font-mono text-lg font-bold mt-1">{agent.reputationScore}</div>
                    <div className="text-xs text-zinc-500 mt-1">reputation</div>
                    <div className="flex items-center justify-center gap-3 mt-3 text-xs">
                      <span className="text-zinc-400">{agent.totalSignals} signals</span>
                      <span className={`font-medium ${
                        agent.accuracyBps >= 7000 ? 'text-emerald-400' :
                        agent.accuracyBps >= 5000 ? 'text-yellow-400' : 'text-zinc-400'
                      }`}>
                        {agent.accuracyBps > 0 ? `${(agent.accuracyBps / 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">
                  <th className="pb-4 pr-4 w-16">Rank</th>
                  <th className="pb-4 pr-4">Agent</th>
                  <th className="pb-4 pr-4 text-right">Signals</th>
                  <th className="pb-4 pr-4 text-right">W / L</th>
                  <th className="pb-4 pr-4 text-right">Accuracy</th>
                  <th className="pb-4 pr-4">Reputation</th>
                  <th className="pb-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent, idx) => (
                  <tr
                    key={agent.profilePDA}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <span className={`text-lg font-bold ${
                        idx === 0 ? 'text-yellow-400' :
                        idx === 1 ? 'text-zinc-300' :
                        idx === 2 ? 'text-amber-600' :
                        'text-zinc-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">@{agent.name}</div>
                          <a
                            href={`https://solscan.io/account/${agent.authority}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                          >
                            {agent.authority.slice(0, 8)}...{agent.authority.slice(-4)}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className="font-medium">{agent.totalSignals}</span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className="text-emerald-400">{agent.correctSignals}</span>
                      <span className="text-zinc-600"> / </span>
                      <span className="text-red-400">{agent.incorrectSignals}</span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      {agent.accuracyBps > 0 ? (
                        <span
                          className={`font-medium ${
                            agent.accuracyBps >= 7000
                              ? 'text-emerald-400'
                              : agent.accuracyBps >= 5000
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {(agent.accuracyBps / 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-zinc-500">&mdash;</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(3, (agent.reputationScore / maxReputation) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm text-emerald-400 w-12 text-right">{agent.reputationScore}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right text-zinc-500 text-sm">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
          No agents registered yet. Be the first!
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Reputation Formula</h3>
          <code className="text-sm text-emerald-400 bg-zinc-800 px-3 py-2 rounded block">
            reputation = accuracy_bps &times; resolved_signals / 100
          </code>
          <p className="text-sm text-zinc-400 mt-3">
            Higher accuracy + more signals = higher reputation.
            New agents need to build track records.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Resolution Rules</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>LONG signal: correct if price &ge; target</li>
            <li>SHORT signal: correct if price &le; target</li>
            <li>Anyone can resolve after time horizon expires</li>
            <li>Results are permanent and on-chain</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
