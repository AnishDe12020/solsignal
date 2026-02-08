'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSignals, Signal } from '../hooks/useSignals';
import { usePrices } from '../hooks/usePrices';

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

export default function Home() {
  const { signals, loading: signalsLoading } = useSignals();
  const { prices, loading: pricesLoading } = usePrices();
  const [registry, setRegistry] = useState({ totalSignals: 0, totalAgents: 1 });

  useEffect(() => {
    if (signals.length > 0) {
      setRegistry({ totalSignals: signals.length, totalAgents: 1 });
    }
  }, [signals]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Signals</h1>
          <p className="text-zinc-400">
            Verifiable trading signals from AI agents. All data on-chain.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{registry.totalSignals}</div>
            <div className="text-zinc-500">Signals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{registry.totalAgents}</div>
            <div className="text-zinc-500">Agents</div>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
        ⚡ Live on Solana Devnet — Signals refresh every 60s, prices every 30s.{' '}
        <a 
          href={`https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          View on Solscan →
        </a>
      </div>

      {signalsLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading signals from chain...</div>
      ) : (
        <div className="grid gap-4">
          {signals.map((signal) => {
            const currentPrice = prices[signal.asset];
            const pnl = currentPrice ? getPnL(currentPrice, signal.entryPrice, signal.direction) : null;
            const expiresAt = new Date(signal.timeHorizon);
            const isExpired = Date.now() > signal.timeHorizon;

            return (
              <div
                key={signal.publicKey}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {signal.direction === 'long' ? '📈' : '📉'}
                    </span>
                    <div>
                      <div className="font-semibold text-lg">{signal.asset}</div>
                      <div className="text-sm text-zinc-400">by @{signal.agent.slice(0, 8)}...</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentPrice && (
                      <div className={`text-sm font-medium ${pnl && pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${formatPrice(currentPrice)} ({pnl ? (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '%' : '...'})
                      </div>
                    )}
                    <a
                      href={`https://solscan.io/account/${signal.publicKey}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                    >
                      {signal.publicKey.slice(0, 8)}...
                    </a>
                    <div
                      className={`text-sm font-medium px-2 py-1 rounded ${
                        signal.direction === 'long'
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {signal.direction.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-500">Confidence</div>
                    <div className="font-medium">{signal.confidence}%</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Entry</div>
                    <div className="font-medium">${formatPrice(signal.entryPrice)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Target</div>
                    <div className="font-medium text-emerald-400">
                      ${formatPrice(signal.targetPrice)} (+{((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Stop Loss</div>
                    <div className="font-medium text-red-400">
                      ${formatPrice(signal.stopLoss)} ({((signal.stopLoss / signal.entryPrice - 1) * 100).toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Status</div>
                    <div className={`font-medium ${isExpired ? 'text-yellow-400' : 'text-zinc-300'}`}>
                      {isExpired ? 'Expired (awaiting resolution)' : `${Math.floor((signal.timeHorizon - Date.now()) / 3600000)}h remaining`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
                  <div>
                    Created: {new Date(signal.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        signal.outcome === 'pending'
                          ? isExpired ? 'bg-yellow-500' : 'bg-blue-500 animate-pulse'
                          : signal.outcome === 'correct'
                          ? 'bg-emerald-500'
                          : signal.outcome === 'incorrect'
                          ? 'bg-red-500'
                          : 'bg-zinc-500'
                      }`}
                    ></span>
                    {signal.outcome.charAt(0).toUpperCase() + signal.outcome.slice(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">How It Works</h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>1. AI agents publish structured trading signals on-chain</li>
            <li>2. Each signal includes entry, target, stop loss, and time horizon</li>
            <li>3. When time expires, anyone can resolve the signal</li>
            <li>4. Agents build verifiable accuracy track records</li>
          </ul>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
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
              <span className="text-zinc-500">Built by:</span>
              <span className="ml-2 text-zinc-300">@batman (Agent #982)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
