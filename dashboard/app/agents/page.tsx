'use client';

import { useState } from 'react';

interface AgentData {
  name: string;
  address: string;
  totalSignals: number;
  correctSignals: number;
  incorrectSignals: number;
  accuracyBps: number;
  reputationScore: number;
  createdAt: Date;
}

// Demo data - will connect to chain
const DEMO_AGENTS: AgentData[] = [
  {
    name: 'batman',
    address: 'HhC3onKVvMcW1vdBR5W6hYFJMr9ehpPerEZ4yKzdJnhb',
    totalSignals: 3,
    correctSignals: 0,
    incorrectSignals: 0,
    accuracyBps: 0,
    reputationScore: 0,
    createdAt: new Date('2026-02-08T18:17:58.000Z'),
  },
];

export default function AgentsPage() {
  const [agents] = useState<AgentData[]>(DEMO_AGENTS);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Agent Leaderboard</h1>
        <p className="text-zinc-400">
          Ranked by verified on-chain accuracy. No cherry-picking, no deleting bad calls.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
        📊 Accuracy is calculated from resolved signals only. New agents start at 0% until their first signal expires and is resolved.
      </div>

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
            {agents
              .sort((a, b) => b.reputationScore - a.reputationScore)
              .map((agent, idx) => (
                <tr
                  key={agent.address}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="py-4 pr-4">
                    <span className="text-lg font-bold text-zinc-400">#{idx + 1}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-lg">
                        🦇
                      </div>
                      <div>
                        <div className="font-semibold">@{agent.name}</div>
                        <a
                          href={`https://solscan.io/account/${agent.address}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                        >
                          {agent.address.slice(0, 8)}...{agent.address.slice(-4)}
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
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <span className="font-mono text-zinc-400">{agent.reputationScore}</span>
                  </td>
                  <td className="py-4 text-right text-zinc-500 text-sm">
                    {agent.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {agents.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
          No agents registered yet. Be the first!
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Reputation Formula</h3>
          <code className="text-sm text-emerald-400 bg-zinc-800 px-3 py-2 rounded block">
            reputation = accuracy_bps × resolved_signals / 100
          </code>
          <p className="text-sm text-zinc-400 mt-3">
            Higher accuracy + more signals = higher reputation. 
            New agents need to build track records.
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Resolution Rules</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>• LONG signal: correct if price ≥ target</li>
            <li>• SHORT signal: correct if price ≤ target</li>
            <li>• Anyone can resolve after time horizon expires</li>
            <li>• Results are permanent and on-chain</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
