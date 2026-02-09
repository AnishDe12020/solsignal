'use client';

import { useState, useEffect } from 'react';
import type { PricesResponse } from '../lib/types';

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices');
        const data: PricesResponse = await res.json();
        if (data.prices) {
          setPrices(data.prices);
        }
        if (data.changes) {
          setChanges(data.changes);
        }
        setLoading(false);
      } catch (e) {
        setError('Failed to fetch prices');
        setLoading(false);
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, loading, error };
}
