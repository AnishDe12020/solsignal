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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Agent Leaderboard</h1>
        <p className="text-zinc-400">
          Ranked by verified on-chain accuracy. No cherry-picking, no deleting bad calls.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
        Accuracy is calculated from resolved signals only. New agents start at 0% until their first signal expires and is resolved.
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">
                <th className="pb-4 pr-4">Rank</th>
                <th className="pb-4 pr-4">Agent</th>
                <th className="pb-4 pr-4 text-right">Signals</th>
                <th className="pb-4 pr-4 text-right">Correct</th>
                <th className="pb-4 pr-4 text-right">Accuracy</th>
                <th className="pb-4 pr-4 text-right">Reputation</th>
                <th className="pb-4 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, idx) => (
                <tr
                  key={agent.profilePDA}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-4 pr-4">
                    <span className="text-lg font-bold text-zinc-400">#{idx + 1}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-bold">
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
                    <span className="text-zinc-500"> / </span>
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
                  <td className="py-4 pr-4 text-right">
                    <span className="font-mono text-zinc-400">{agent.reputationScore}</span>
                  </td>
                  <td className="py-4 text-right text-zinc-500 text-sm">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
          No agents registered yet. Be the first!
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Reputation Formula</h3>
          <code className="text-sm text-emerald-400 bg-zinc-800 px-3 py-2 rounded block">
            reputation = accuracy_bps &times; resolved_signals / 100
          </code>
          <p className="text-sm text-zinc-400 mt-3">
            Higher accuracy + more signals = higher reputation.
            New agents need to build track records.
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
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
