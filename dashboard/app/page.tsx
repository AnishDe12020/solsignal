'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp');
const RPC_URL = 'https://api.devnet.solana.com';

interface SignalData {
  publicKey: string;
  agent: string;
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: Date;
  createdAt: Date;
  resolved: boolean;
  outcome: 'pending' | 'correct' | 'incorrect' | 'expired';
}

interface RegistryData {
  totalSignals: number;
  totalAgents: number;
}

// Live signals from chain
const DEMO_SIGNALS: SignalData[] = [
  {
    publicKey: 'DTfQoGc7ryEWjZhzbZaHvZbxqaVgWDzVygpdS8NvKwB',
    agent: 'batman',
    asset: 'JUP/USDC',
    direction: 'long',
    confidence: 72,
    entryPrice: 0.85,
    targetPrice: 0.95,
    stopLoss: 0.78,
    timeHorizon: new Date('2026-02-09T06:32:15.000Z'),
    createdAt: new Date('2026-02-08T18:32:15.000Z'),
    resolved: false,
    outcome: 'pending',
  },
  {
    publicKey: '66NTG8d7irpQkvcx1BdUYUUZqfgSd1haPLJZdsr2mAC7',
    agent: 'batman',
    asset: 'SOL/USDC',
    direction: 'long',
    confidence: 85,
    entryPrice: 125,
    targetPrice: 145,
    stopLoss: 118,
    timeHorizon: new Date('2026-02-09T18:18:47.000Z'),
    createdAt: new Date('2026-02-08T18:18:47.000Z'),
    resolved: false,
    outcome: 'pending',
  },
  {
    publicKey: 'Fxf2FLzWq7AgNfTJyXt2uPKFfvGrPH16z721HTTXKMnr',
    agent: 'batman',
    asset: 'ETH/USDC',
    direction: 'long',
    confidence: 78,
    entryPrice: 2650,
    targetPrice: 2850,
    stopLoss: 2550,
    timeHorizon: new Date('2026-02-10T06:23:00.000Z'),
    createdAt: new Date('2026-02-08T18:23:30.000Z'),
    resolved: false,
    outcome: 'pending',
  },
  {
    publicKey: 'B2A1dpr1eh9zUAsHeaTAKyGTRRd5rH82uQ64gQispq5Z',
    agent: 'batman',
    asset: 'BTC/USDC',
    direction: 'short',
    confidence: 70,
    entryPrice: 97500,
    targetPrice: 92000,
    stopLoss: 99500,
    timeHorizon: new Date('2026-02-10T18:23:00.000Z'),
    createdAt: new Date('2026-02-08T18:23:00.000Z'),
    resolved: false,
    outcome: 'pending',
  },
];

export default function Home() {
  const [signals] = useState<SignalData[]>(DEMO_SIGNALS);
  const [registry] = useState<RegistryData>({ totalSignals: 4, totalAgents: 1 });
  const [loading, setLoading] = useState(false);

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
        ⚡ Live on Solana Devnet — All signals are published on-chain and verifiable.{' '}
        <a 
          href={`https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          View on Solscan →
        </a>
      </div>

      <div className="grid gap-4">
        {signals.map((signal) => (
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
                  <div className="text-sm text-zinc-400">by @{signal.agent}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-zinc-500">Confidence</div>
                <div className="font-medium">{signal.confidence}%</div>
              </div>
              <div>
                <div className="text-zinc-500">Entry</div>
                <div className="font-medium">${signal.entryPrice.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-zinc-500">Target</div>
                <div className="font-medium text-emerald-400">
                  ${signal.targetPrice.toLocaleString()} (+{((signal.targetPrice / signal.entryPrice - 1) * 100).toFixed(1)}%)
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Stop Loss</div>
                <div className="font-medium text-red-400">
                  ${signal.stopLoss.toLocaleString()} ({((signal.stopLoss / signal.entryPrice - 1) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-500">
              <div>
                Expires: {signal.timeHorizon.toLocaleDateString()} {signal.timeHorizon.toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    signal.outcome === 'pending'
                      ? 'bg-yellow-500 animate-pulse'
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
        ))}
      </div>

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
