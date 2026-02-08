'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [newSignals, setNewSignals] = useState<Signal[]>([]);
  const prevKeysRef = useRef<Set<string>>(new Set());

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      if (data.signals) {
        const incoming: Signal[] = data.signals;

        // Detect new signals
        if (prevKeysRef.current.size > 0) {
          const fresh = incoming.filter(s => !prevKeysRef.current.has(s.publicKey));
          if (fresh.length > 0) {
            setNewSignals(fresh);
          }
        }

        prevKeysRef.current = new Set(incoming.map(s => s.publicKey));
        setSignals(incoming);
        setLastUpdated(Date.now());
      }
      setLoading(false);
    } catch {
      setError('Failed to fetch signals');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const clearNewSignals = useCallback(() => setNewSignals([]), []);

  return { signals, loading, error, lastUpdated, newSignals, clearNewSignals };
}
