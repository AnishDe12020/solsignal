'use client';

import { useState } from 'react';

export default function PublishPage() {
  const [formData, setFormData] = useState({
    asset: 'SOL/USDC',
    direction: 'long',
    confidence: 75,
    entryPrice: '',
    targetPrice: '',
    stopLoss: '',
    timeHorizon: '24',
    reasoning: '',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Publish Signal</h1>
        <p className="text-zinc-400">
          Submit a trading signal to the blockchain. Once published, it cannot be deleted.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-amber-200 text-sm">
        ⚠️ Signals are permanent. They affect your on-chain reputation. Think before you publish.
      </div>

      <form className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Asset Pair</label>
            <select
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="SOL/USDC">SOL/USDC</option>
              <option value="BTC/USDC">BTC/USDC</option>
              <option value="ETH/USDC">ETH/USDC</option>
              <option value="BONK/USDC">BONK/USDC</option>
              <option value="JUP/USDC">JUP/USDC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'long' })}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  formData.direction === 'long'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                📈 LONG
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'short' })}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  formData.direction === 'short'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                📉 SHORT
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            Confidence: {formData.confidence}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={formData.confidence}
            onChange={(e) =>
              setFormData({ ...formData, confidence: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>Low (10%)</span>
            <span>High (100%)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Entry Price ($)</label>
            <input
              type="number"
              placeholder="125.00"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Price ($)</label>
            <input
              type="number"
              placeholder="145.00"
              value={formData.targetPrice}
              onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Stop Loss ($)</label>
            <input
              type="number"
              placeholder="118.00"
              value={formData.stopLoss}
              onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Time Horizon</label>
          <select
            value={formData.timeHorizon}
            onChange={(e) => setFormData({ ...formData, timeHorizon: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
            <option value="168">1 week</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Reasoning (optional)</label>
          <textarea
            placeholder="Technical analysis, market thesis, catalysts..."
            value={formData.reasoning}
            onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
            rows={4}
            maxLength={512}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
          />
          <div className="text-xs text-zinc-500 mt-1 text-right">
            {formData.reasoning.length}/512 characters
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Signal Preview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Asset:</span>{' '}
              <span className="font-medium">{formData.asset}</span>
            </div>
            <div>
              <span className="text-zinc-500">Direction:</span>{' '}
              <span
                className={`font-medium ${
                  formData.direction === 'long' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formData.direction.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Confidence:</span>{' '}
              <span className="font-medium">{formData.confidence}%</span>
            </div>
            <div>
              <span className="text-zinc-500">Horizon:</span>{' '}
              <span className="font-medium">{formData.timeHorizon}h</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled
          className="w-full bg-zinc-700 text-zinc-400 py-4 rounded-lg font-semibold cursor-not-allowed"
        >
          🔒 Connect Wallet to Publish
        </button>

        <p className="text-xs text-zinc-500 text-center">
          Publishing requires a Solana wallet with devnet SOL. Use the SDK for programmatic access.
        </p>
      </form>
    </div>
  );
}
