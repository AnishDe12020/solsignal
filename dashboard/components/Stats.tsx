'use client';

import { useSignals } from '../hooks/useSignals';

export function Stats() {
  const { signals } = useSignals();
  
  const pending = signals.filter(s => s.outcome === 'pending').length;
  const expired = signals.filter(s => s.outcome === 'pending' && Date.now() > s.timeHorizon).length;
  const correct = signals.filter(s => s.outcome === 'correct').length;
  const incorrect = signals.filter(s => s.outcome === 'incorrect').length;
  const resolved = correct + incorrect;
  const accuracy = resolved > 0 ? ((correct / resolved) * 100).toFixed(1) : '—';

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-emerald-400">{signals.length}</div>
        <div className="text-xs text-zinc-500">Total Signals</div>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-blue-400">{pending - expired}</div>
        <div className="text-xs text-zinc-500">Active</div>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-yellow-400">{expired}</div>
        <div className="text-xs text-zinc-500">Awaiting Resolution</div>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-emerald-400">{correct}</div>
        <div className="text-xs text-zinc-500">Correct</div>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="text-2xl font-bold text-white">{accuracy}%</div>
        <div className="text-xs text-zinc-500">Accuracy</div>
      </div>
    </div>
  );
}
