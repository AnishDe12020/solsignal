'use client';

import { useState, useEffect } from 'react';

export interface Signal {
  publicKey: string;
  agent: string;
  index: number;
  asset: string;
  direction: 'long' | 'short';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number;
  createdAt: number;
  resolved: boolean;
  outcome: 'pending' | 'correct' | 'incorrect' | 'expired';
}

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch('/api/signals');
        const data = await res.json();
        if (data.signals) {
          setSignals(data.signals);
        }
        setLoading(false);
      } catch (e) {
        setError('Failed to fetch signals');
        setLoading(false);
      }
    }

    fetchSignals();
    // Refresh every 60 seconds
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  return { signals, loading, error };
}
