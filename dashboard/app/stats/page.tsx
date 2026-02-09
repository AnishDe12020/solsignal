'use client';

import { useState, useEffect } from 'react';
import { Signal, useSignals } from '../../hooks/useSignals';

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

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 sm:p-5">
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl sm:text-3xl font-bold ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-20 sm:w-24 text-sm text-zinc-400 text-right shrink-0 truncate">{item.label}</div>
          <div className="flex-1 h-8 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-700 ${item.color}`}
              style={{ width: maxValue > 0 ? `${Math.max(2, (item.value / maxValue) * 100)}%` : '0%' }}
            />
          </div>
          <div className="w-10 text-sm font-medium text-zinc-300 text-right shrink-0">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ correct, incorrect, expired, pending }: { correct: number; incorrect: number; expired: number; pending: number }) {
  const total = correct + incorrect + expired + pending;
  if (total === 0) return null;
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: correct, color: '#34d399', label: 'Correct' },
    { value: incorrect, color: '#f87171', label: 'Incorrect' },
    { value: expired, color: '#a1a1aa', label: 'Expired' },
    { value: pending, color: '#60a5fa', label: 'Pending' },
  ].filter(s => s.value > 0);

  let offset = 0;
  const accuracy = (correct + incorrect) > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const dashLen = (seg.value / total) * circumference;
          const dashGap = circumference - dashLen;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dashLen;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="fill-white text-2xl font-bold" fontSize="24">{accuracy}%</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-zinc-400 text-xs" fontSize="11">accuracy</text>
      </svg>
      <div className="flex flex-wrap gap-3 justify-center text-xs">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-zinc-400">{s.label}: {s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AccuracyOverTimeChart({ signals }: { signals: Signal[] }) {
  const resolved = signals
    .filter(s => s.outcome === 'correct' || s.outcome === 'incorrect')
    .sort((a, b) => a.createdAt - b.createdAt);

  if (resolved.length < 2) return <p className="text-zinc-500 text-sm">Need more resolved signals for trend chart</p>;

  const points: { date: number; accuracy: number; cumCorrect: number; cumTotal: number }[] = [];
  let cumCorrect = 0;
  let cumTotal = 0;

  resolved.forEach(s => {
    cumTotal++;
    if (s.outcome === 'correct') cumCorrect++;
    points.push({
      date: s.createdAt,
      accuracy: (cumCorrect / cumTotal) * 100,
      cumCorrect,
      cumTotal,
    });
  });

  const width = 500;
  const height = 160;
  const padX = 40;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const minDate = points[0].date;
  const maxDate = points[points.length - 1].date;
  const dateRange = maxDate - minDate || 1;

  const pathPoints = points.map((p, i) => {
    const x = padX + (((p.date - minDate) / dateRange) * chartW);
    const y = padY + chartH - ((p.accuracy / 100) * chartH);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  const areaPath = pathPoints + ` L${padX + chartW},${padY + chartH} L${padX},${padY + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 25, 50, 75, 100].map(pct => {
        const y = padY + chartH - ((pct / 100) * chartH);
        return (
          <g key={pct}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="#27272a" strokeWidth="1" />
            <text x={padX - 4} y={y + 4} textAnchor="end" className="fill-zinc-600" fontSize="9">{pct}%</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#accuracyGradient)" opacity="0.3" />
      <path d={pathPoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = padX + (((p.date - minDate) / dateRange) * chartW);
        const y = padY + chartH - ((p.accuracy / 100) * chartH);
        return <circle key={i} cx={x} cy={y} r="3" fill="#34d399" stroke="#0a0a0b" strokeWidth="1.5" />;
      })}
      {points.length > 0 && (
        <text
          x={padX + chartW + 4}
          y={padY + chartH - ((points[points.length - 1].accuracy / 100) * chartH) + 4}
          className="fill-emerald-400 font-bold"
          fontSize="11"
        >
          {points[points.length - 1].accuracy.toFixed(0)}%
        </text>
      )}
      <defs>
        <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WinRateByAssetChart({ signals }: { signals: Signal[] }) {
  const assetStats: Record<string, { correct: number; total: number }> = {};
  signals.forEach(s => {
    if (s.outcome === 'correct' || s.outcome === 'incorrect') {
      if (!assetStats[s.asset]) assetStats[s.asset] = { correct: 0, total: 0 };
      assetStats[s.asset].total++;
      if (s.outcome === 'correct') assetStats[s.asset].correct++;
    }
  });

  const entries = Object.entries(assetStats).sort((a, b) => b[1].total - a[1].total);
  if (entries.length === 0) return <p className="text-zinc-500 text-sm">No resolved signals yet</p>;

  return (
    <div className="space-y-3">
      {entries.map(([asset, stats]) => {
        const rate = Math.round((stats.correct / stats.total) * 100);
        return (
          <div key={asset}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-200 font-medium">{asset}</span>
              <span className="text-zinc-400">{stats.correct}/{stats.total} ({rate}%)</span>
            </div>
            <div className="h-6 bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-700 flex items-center justify-end pr-1"
                style={{ width: `${rate}%` }}
              >
                {rate >= 20 && <span className="text-[10px] text-emerald-950 font-bold">{rate}%</span>}
              </div>
              {(100 - rate) > 0 && (
                <div
                  className="h-full bg-red-500/60"
                  style={{ width: `${100 - rate}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Learning & Calibration Components ───────────────────────────

function CalibrationChart({ signals }: { signals: Signal[] }) {
  const buckets = [
    { label: '50-60%', min: 50, max: 60 },
    { label: '60-70%', min: 60, max: 70 },
    { label: '70-80%', min: 70, max: 80 },
    { label: '80-90%', min: 80, max: 90 },
  ];

  const data = buckets.map(b => {
    const inBucket = signals.filter(
      s => s.confidence >= b.min && s.confidence < b.max && (s.outcome === 'correct' || s.outcome === 'incorrect')
    );
    const correct = inBucket.filter(s => s.outcome === 'correct').length;
    const total = inBucket.length;
    const actualAccuracy = total > 0 ? Math.round((correct / total) * 100) : null;
    const expectedMidpoint = Math.round((b.min + b.max) / 2);
    return { ...b, correct, total, actualAccuracy, expectedMidpoint };
  });

  const hasData = data.some(d => d.total > 0);

  if (!hasData) {
    return <p className="text-zinc-500 text-sm">Need resolved signals with confidence 50%+ for calibration data</p>;
  }

  return (
    <div className="space-y-4">
      {data.map(d => {
        const expectedPct = d.expectedMidpoint;
        const actualPct = d.actualAccuracy;
        const diff = actualPct !== null ? actualPct - expectedPct : null;
        const isOver = diff !== null && diff > 0;
        const isUnder = diff !== null && diff < 0;

        return (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300 font-medium w-16">{d.label}</span>
              <span className="text-xs text-zinc-500">
                {d.total > 0 ? `${d.correct}/${d.total} signals` : 'No data'}
              </span>
              {diff !== null && (
                <span className={`text-xs font-mono ${isOver ? 'text-emerald-400' : isUnder ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {diff > 0 ? '+' : ''}{diff}%
                </span>
              )}
            </div>
            <div className="relative h-7 bg-zinc-800 rounded overflow-hidden">
              {/* Expected accuracy bar (faded) */}
              <div
                className="absolute top-0 left-0 h-full bg-zinc-600/40 rounded transition-all duration-700"
                style={{ width: `${expectedPct}%` }}
              />
              {/* Actual accuracy bar */}
              {actualPct !== null && (
                <div
                  className={`absolute top-0 left-0 h-full rounded transition-all duration-700 ${
                    isOver ? 'bg-emerald-500/70' : isUnder ? 'bg-amber-500/70' : 'bg-blue-500/70'
                  }`}
                  style={{ width: `${actualPct}%` }}
                />
              )}
              {/* Expected line marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-zinc-400"
                style={{ left: `${expectedPct}%` }}
              />
              {/* Labels inside bar */}
              <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px]">
                <span className="text-zinc-300">
                  Actual: {actualPct !== null ? `${actualPct}%` : '—'}
                </span>
                <span className="text-zinc-400">
                  Expected: {expectedPct}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500 mt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-zinc-600/40 rounded" /> Expected</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/70 rounded" /> Overperforming</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-500/70 rounded" /> Underperforming</span>
        <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-zinc-400" /> Expected midpoint</span>
      </div>
    </div>
  );
}

function AssetPerformanceTable({ signals }: { signals: Signal[] }) {
  const assetStats: Record<string, {
    correct: number; incorrect: number; total: number;
    totalConfidence: number; avgEntry: number; bestPnL: number; worstPnL: number;
  }> = {};

  signals.forEach(s => {
    if (s.outcome !== 'correct' && s.outcome !== 'incorrect') return;
    if (!assetStats[s.asset]) {
      assetStats[s.asset] = { correct: 0, incorrect: 0, total: 0, totalConfidence: 0, avgEntry: 0, bestPnL: -Infinity, worstPnL: Infinity };
    }
    const st = assetStats[s.asset];
    st.total++;
    st.totalConfidence += s.confidence;
    if (s.outcome === 'correct') st.correct++;
    else st.incorrect++;

    // Calculate P&L for this signal
    if (s.entryPrice > 0 && s.resolutionPrice && s.resolutionPrice > 0) {
      const pnl = s.direction === 'long'
        ? ((s.resolutionPrice - s.entryPrice) / s.entryPrice) * 100
        : ((s.entryPrice - s.resolutionPrice) / s.entryPrice) * 100;
      if (pnl > st.bestPnL) st.bestPnL = pnl;
      if (pnl < st.worstPnL) st.worstPnL = pnl;
    }
  });

  const entries = Object.entries(assetStats)
    .map(([asset, st]) => ({
      asset,
      accuracy: Math.round((st.correct / st.total) * 100),
      correct: st.correct,
      incorrect: st.incorrect,
      total: st.total,
      avgConf: Math.round(st.totalConfidence / st.total),
      bestPnL: st.bestPnL === -Infinity ? null : st.bestPnL,
      worstPnL: st.worstPnL === Infinity ? null : st.worstPnL,
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

  if (entries.length === 0) {
    return <p className="text-zinc-500 text-sm">No resolved signals yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
            <th className="text-left py-2 pr-3">Asset</th>
            <th className="text-center py-2 px-2">W/L</th>
            <th className="text-center py-2 px-2">Accuracy</th>
            <th className="text-center py-2 px-2">Avg Conf</th>
            <th className="text-center py-2 px-2">Best</th>
            <th className="text-center py-2 px-2">Worst</th>
            <th className="text-left py-2 pl-2">Grade</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => {
            const grade = e.accuracy >= 75 ? { text: '🟢 Strong', cls: 'text-emerald-400' }
              : e.accuracy >= 55 ? { text: '🟡 Learning', cls: 'text-amber-400' }
              : { text: '🔴 Weak', cls: 'text-red-400' };
            return (
              <tr key={e.asset} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 pr-3 text-zinc-200 font-medium">{e.asset}</td>
                <td className="py-2 px-2 text-center">
                  <span className="text-emerald-400">{e.correct}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-red-400">{e.incorrect}</span>
                </td>
                <td className="py-2 px-2 text-center font-mono">
                  <span className={e.accuracy >= 60 ? 'text-emerald-400' : e.accuracy >= 45 ? 'text-amber-400' : 'text-red-400'}>
                    {e.accuracy}%
                  </span>
                </td>
                <td className="py-2 px-2 text-center text-zinc-400 font-mono">{e.avgConf}%</td>
                <td className="py-2 px-2 text-center text-emerald-400 font-mono text-xs">
                  {e.bestPnL !== null ? `+${e.bestPnL.toFixed(1)}%` : '—'}
                </td>
                <td className="py-2 px-2 text-center text-red-400 font-mono text-xs">
                  {e.worstPnL !== null ? `${e.worstPnL.toFixed(1)}%` : '—'}
                </td>
                <td className={`py-2 pl-2 text-xs ${grade.cls}`}>{grade.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceAdjustmentLog({ signals }: { signals: Signal[] }) {
  // Group resolved signals by asset, then calculate calibration adjustments
  const assetGroups: Record<string, Signal[]> = {};
  signals
    .filter(s => s.outcome === 'correct' || s.outcome === 'incorrect')
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach(s => {
      if (!assetGroups[s.asset]) assetGroups[s.asset] = [];
      assetGroups[s.asset].push(s);
    });

  interface LogEntry {
    asset: string;
    message: string;
    type: 'reduce' | 'boost' | 'stable';
    timestamp: number;
  }
  const logEntries: LogEntry[] = [];

  Object.entries(assetGroups).forEach(([asset, sigs]) => {
    if (sigs.length < 2) return;

    // Walk through signals tracking rolling accuracy + confidence adjustments
    let rollingCorrect = 0;
    let rollingTotal = 0;
    let prevConfAvg = 0;
    let streakIncorrect = 0;

    sigs.forEach((s, i) => {
      rollingTotal++;
      if (s.outcome === 'correct') {
        rollingCorrect++;
        streakIncorrect = 0;
      } else {
        streakIncorrect++;
      }

      const rollingAccuracy = Math.round((rollingCorrect / rollingTotal) * 100);
      const currentConfAvg = Math.round(
        sigs.slice(0, i + 1).reduce((sum, sig) => sum + sig.confidence, 0) / (i + 1)
      );

      // Detect calibration events
      if (streakIncorrect >= 2 && i >= 2) {
        const beforeConf = sigs.slice(Math.max(0, i - streakIncorrect), i - streakIncorrect + 1)
          .reduce((sum, sig) => sum + sig.confidence, 0) / 1;
        const afterConf = s.confidence;
        if (beforeConf > afterConf) {
          logEntries.push({
            asset,
            message: `${asset}: confidence reduced ${Math.round(beforeConf)}% → ${afterConf}% after ${streakIncorrect} incorrect signals`,
            type: 'reduce',
            timestamp: s.createdAt,
          });
        } else if (beforeConf === afterConf || beforeConf < afterConf) {
          logEntries.push({
            asset,
            message: `${asset}: ${streakIncorrect} consecutive misses (accuracy now ${rollingAccuracy}%) — recalibration needed`,
            type: 'reduce',
            timestamp: s.createdAt,
          });
        }
      }

      // Detect confidence boosts after winning streaks
      if (s.outcome === 'correct' && i >= 3) {
        const last3 = sigs.slice(i - 2, i + 1);
        if (last3.every(sig => sig.outcome === 'correct')) {
          const earlyConf = sigs.slice(Math.max(0, i - 4), Math.max(0, i - 4) + 1)[0]?.confidence || s.confidence;
          if (s.confidence > earlyConf) {
            logEntries.push({
              asset,
              message: `${asset}: confidence boosted ${earlyConf}% → ${s.confidence}% after 3-win streak (accuracy ${rollingAccuracy}%)`,
              type: 'boost',
              timestamp: s.createdAt,
            });
          }
        }
      }

      prevConfAvg = currentConfAvg;
    });

    // Summary entry for each asset
    const accuracy = Math.round((rollingCorrect / rollingTotal) * 100);
    const avgConf = Math.round(sigs.reduce((sum, s) => sum + s.confidence, 0) / sigs.length);
    if (rollingTotal >= 3) {
      const diff = accuracy - avgConf;
      if (Math.abs(diff) > 10) {
        logEntries.push({
          asset,
          message: `${asset}: avg confidence ${avgConf}% vs actual ${accuracy}% — ${diff > 0 ? 'underconfident by' : 'overconfident by'} ${Math.abs(diff)}%`,
          type: diff > 0 ? 'boost' : 'reduce',
          timestamp: Date.now(),
        });
      } else {
        logEntries.push({
          asset,
          message: `${asset}: well-calibrated — confidence ${avgConf}% ≈ accuracy ${accuracy}% (${rollingTotal} signals)`,
          type: 'stable',
          timestamp: Date.now(),
        });
      }
    }
  });

  logEntries.sort((a, b) => b.timestamp - a.timestamp);

  if (logEntries.length === 0) {
    return <p className="text-zinc-500 text-sm">Need 2+ resolved signals per asset for calibration log</p>;
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {logEntries.slice(0, 20).map((entry, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg border ${
            entry.type === 'reduce' ? 'bg-red-950/20 border-red-900/30' :
            entry.type === 'boost' ? 'bg-emerald-950/20 border-emerald-900/30' :
            'bg-zinc-800/30 border-zinc-700/30'
          }`}
        >
          <span className="mt-0.5 text-base shrink-0">
            {entry.type === 'reduce' ? '⚠️' : entry.type === 'boost' ? '📈' : '✅'}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs ${
              entry.type === 'reduce' ? 'text-red-300' :
              entry.type === 'boost' ? 'text-emerald-300' :
              'text-zinc-300'
            }`}>
              {entry.message}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {entry.timestamp < Date.now() - 60000
                ? new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Summary'
              }
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PnLChart({ signals }: { signals: Signal[] }) {
  const resolved = signals
    .filter(s => (s.outcome === 'correct' || s.outcome === 'incorrect') && s.entryPrice > 0)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (resolved.length < 2) return <p className="text-zinc-500 text-sm">Need more resolved signals for P&L chart</p>;

  const points: { date: number; cumPnL: number }[] = [];
  let cumPnL = 0;

  resolved.forEach(s => {
    if (s.outcome === 'correct') {
      const gain = ((s.targetPrice - s.entryPrice) / s.entryPrice) * 100;
      cumPnL += gain;
    } else {
      const loss = ((s.stopLoss - s.entryPrice) / s.entryPrice) * 100;
      cumPnL += loss;
    }
    points.push({ date: s.createdAt, cumPnL });
  });

  const width = 500;
  const height = 140;
  const padX = 50;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const minPnL = Math.min(0, ...points.map(p => p.cumPnL));
  const maxPnL = Math.max(0, ...points.map(p => p.cumPnL));
  const range = maxPnL - minPnL || 1;

  const minDate = points[0].date;
  const maxDate = points[points.length - 1].date;
  const dateRange = maxDate - minDate || 1;

  const zeroY = padY + chartH - ((0 - minPnL) / range * chartH);

  const pathPoints = points.map((p, i) => {
    const x = padX + (((p.date - minDate) / dateRange) * chartW);
    const y = padY + chartH - (((p.cumPnL - minPnL) / range) * chartH);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  const finalPnL = points[points.length - 1].cumPnL;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <line x1={padX} y1={zeroY} x2={padX + chartW} y2={zeroY} stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
        <text x={padX - 4} y={zeroY + 3} textAnchor="end" className="fill-zinc-500" fontSize="9">0%</text>
        <path d={pathPoints} fill="none" stroke={finalPnL >= 0 ? '#34d399' : '#f87171'} strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = padX + (((p.date - minDate) / dateRange) * chartW);
          const y = padY + chartH - (((p.cumPnL - minPnL) / range) * chartH);
          return <circle key={i} cx={x} cy={y} r="3" fill={p.cumPnL >= 0 ? '#34d399' : '#f87171'} stroke="#0a0a0b" strokeWidth="1.5" />;
        })}
        <text
          x={padX + chartW + 4}
          y={padY + chartH - (((finalPnL - minPnL) / range) * chartH) + 4}
          className={finalPnL >= 0 ? 'fill-emerald-400' : 'fill-red-400'}
          fontWeight="bold"
          fontSize="11"
        >
          {finalPnL >= 0 ? '+' : ''}{finalPnL.toFixed(1)}%
        </text>
      </svg>
      <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 mt-1">
        <span>Cumulative P&L based on target/stop-loss prices</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { signals, loading: signalsLoading } = useSignals();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.agents) setAgents(data.agents);
      } catch {}
      setAgentsLoading(false);
    }
    fetchAgents();
  }, []);

  const loading = signalsLoading || agentsLoading;

  const total = signals.length;
  const active = signals.filter(s => s.outcome === 'pending' && Date.now() <= s.timeHorizon).length;
  const expired = signals.filter(s => s.outcome === 'pending' && Date.now() > s.timeHorizon).length;
  const correct = signals.filter(s => s.outcome === 'correct').length;
  const incorrect = signals.filter(s => s.outcome === 'incorrect').length;
  const expiredOutcome = signals.filter(s => s.outcome === 'expired').length;
  const resolved = correct + incorrect;
  const accuracy = resolved > 0 ? ((correct / resolved) * 100).toFixed(1) : '—';

  const longSignals = signals.filter(s => s.direction === 'long').length;
  const shortSignals = signals.filter(s => s.direction === 'short').length;

  const assetCounts: Record<string, number> = {};
  signals.forEach(s => {
    assetCounts[s.asset] = (assetCounts[s.asset] || 0) + 1;
  });
  const assetData = Object.entries(assetCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: 'bg-emerald-500' }));
  const maxAsset = assetData.length > 0 ? assetData[0].value : 0;

  const outcomeData = [
    { label: 'Active', value: active, color: 'bg-blue-500' },
    { label: 'Awaiting', value: expired, color: 'bg-yellow-500' },
    { label: 'Correct', value: correct, color: 'bg-emerald-500' },
    { label: 'Incorrect', value: incorrect, color: 'bg-red-500' },
  ];
  const maxOutcome = Math.max(...outcomeData.map(d => d.value), 1);

  const now = Date.now();
  const dayMs = 86400000;
  const dayBuckets: { label: string; value: number; color: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = now - i * dayMs;
    const dayEnd = dayStart + dayMs;
    const count = signals.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd).length;
    const date = new Date(dayStart);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    dayBuckets.push({ label, value: count, color: 'bg-emerald-500' });
  }
  const maxDay = Math.max(...dayBuckets.map(d => d.value), 1);

  const confBuckets = [
    { label: '10-30%', min: 10, max: 30 },
    { label: '31-50%', min: 31, max: 50 },
    { label: '51-70%', min: 51, max: 70 },
    { label: '71-90%', min: 71, max: 90 },
    { label: '91-100%', min: 91, max: 100 },
  ].map(b => ({
    label: b.label,
    value: signals.filter(s => s.confidence >= b.min && s.confidence <= b.max).length,
    color: 'bg-blue-500',
  }));
  const maxConf = Math.max(...confBuckets.map(d => d.value), 1);

  const topAgent = agents.length > 0 ? agents.reduce((a, b) => a.reputationScore > b.reputationScore ? a : b) : null;
  const batmanAgent = agents.find(a => a.name.toLowerCase().includes('batman')) || null;
  const agentSignals = batmanAgent ? signals.filter(s => s.agent === batmanAgent.authority) : signals;

  const agentCorrect = agentSignals.filter(s => s.outcome === 'correct').length;
  const agentIncorrect = agentSignals.filter(s => s.outcome === 'incorrect').length;
  const agentExpired = agentSignals.filter(s => s.outcome === 'expired').length;
  const agentPending = agentSignals.filter(s => s.outcome === 'pending').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Protocol Analytics</h1>
        <p className="text-zinc-400 text-sm sm:text-base">
          Live stats from the SolSignal program on Solana Devnet.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500">Loading analytics from chain...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <StatCard label="Total Signals" value={total} color="text-emerald-400" />
            <StatCard label="Active" value={active} sub="Currently live" color="text-blue-400" />
            <StatCard label="Awaiting Resolution" value={expired} color="text-yellow-400" />
            <StatCard label="Resolved" value={resolved} sub={`${correct}W / ${incorrect}L`} color="text-zinc-100" />
            <StatCard label="Accuracy" value={resolved > 0 ? `${accuracy}%` : '—'} sub={resolved > 0 ? `${resolved} resolved` : 'No resolved signals'} color="text-emerald-400" />
            <StatCard label="Agents" value={agents.length} sub={topAgent ? `Top: @${topAgent.name}` : ''} color="text-blue-400" />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold">
                {batmanAgent ? batmanAgent.name.slice(0, 2).toUpperCase() : (topAgent ? topAgent.name.slice(0, 2).toUpperCase() : '??')}
              </div>
              <div>
                <h2 className="text-xl font-bold">Agent Performance{batmanAgent ? `: @${batmanAgent.name}` : ' (All Agents)'}</h2>
                <p className="text-xs text-zinc-500">Accuracy, win rate, and P&L analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="font-medium text-sm text-zinc-400 mb-4 text-center">Signal Outcomes</h3>
                <DonutChart correct={agentCorrect} incorrect={agentIncorrect} expired={agentExpired} pending={agentPending} />
              </div>

              <div className="bg-zinc-950/50 rounded-lg p-4 lg:col-span-2">
                <h3 className="font-medium text-sm text-zinc-400 mb-4">Accuracy Over Time</h3>
                <AccuracyOverTimeChart signals={agentSignals} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="font-medium text-sm text-zinc-400 mb-4">Win Rate by Asset</h3>
                <WinRateByAssetChart signals={agentSignals} />
              </div>

              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="font-medium text-sm text-zinc-400 mb-4">Cumulative P&L</h3>
                <PnLChart signals={agentSignals} />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Signal Direction</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-emerald-400">Long</span>
                    <span className="text-zinc-400">{longSignals}</span>
                  </div>
                  <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: total > 0 ? `${(longSignals / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-400">Short</span>
                    <span className="text-zinc-400">{shortSignals}</span>
                  </div>
                  <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: total > 0 ? `${(shortSignals / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500 text-center">
                {total > 0 ? `${((longSignals / total) * 100).toFixed(0)}% long / ${((shortSignals / total) * 100).toFixed(0)}% short` : 'No signals yet'}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Outcome Distribution</h3>
              <BarChart data={outcomeData} maxValue={maxOutcome} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
            <h3 className="font-semibold mb-4">Signals by Asset</h3>
            {assetData.length > 0 ? (
              <BarChart data={assetData} maxValue={maxAsset} />
            ) : (
              <p className="text-zinc-500 text-sm">No signals yet</p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
            <h3 className="font-semibold mb-4">Signals Published (Last 14 Days)</h3>
            <div className="flex items-end gap-1 h-40">
              {dayBuckets.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-emerald-500/80 rounded-t transition-all duration-500 min-h-[2px]"
                    style={{ height: `${Math.max(2, (day.value / maxDay) * 100)}%` }}
                  />
                  <div className="text-[10px] text-zinc-500 mt-1 whitespace-nowrap">{day.label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* ── Learning & Calibration Section ───────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs">
                🧠
              </div>
              <div>
                <h2 className="text-xl font-bold">Learning &amp; Calibration</h2>
                <p className="text-xs text-zinc-500">How well batman&apos;s confidence predictions match actual outcomes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="font-medium text-sm text-zinc-400 mb-4">Confidence Calibration</h3>
                <p className="text-[10px] text-zinc-600 mb-3">
                  Are confidence predictions accurate? Bars show actual accuracy vs expected for each confidence bucket.
                </p>
                <CalibrationChart signals={agentSignals} />
              </div>

              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="font-medium text-sm text-zinc-400 mb-4">Confidence Adjustment Log</h3>
                <p className="text-[10px] text-zinc-600 mb-3">
                  How the agent adapts confidence over time based on past performance.
                </p>
                <ConfidenceAdjustmentLog signals={agentSignals} />
              </div>
            </div>

            <div className="mt-6 bg-zinc-950/50 rounded-lg p-4">
              <h3 className="font-medium text-sm text-zinc-400 mb-4">Per-Asset Performance Breakdown</h3>
              <p className="text-[10px] text-zinc-600 mb-3">
                Which assets batman is best and worst at — showing accuracy, average confidence, and P&amp;L extremes.
              </p>
              <AssetPerformanceTable signals={agentSignals} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
            <h3 className="font-semibold mb-4">Confidence Distribution</h3>
            <BarChart data={confBuckets} maxValue={maxConf} />
          </div>

          {agents.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold mb-4">Top Agents by Reputation</h3>
              <div className="space-y-3">
                {agents.slice(0, 5).map((agent, idx) => (
                  <div key={agent.profilePDA} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-500 w-6">#{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">@{agent.name}</div>
                      <div className="text-xs text-zinc-500">
                        {agent.totalSignals} signals · {agent.correctSignals}W/{agent.incorrectSignals}L
                        {agent.accuracyBps > 0 ? ` · ${(agent.accuracyBps / 100).toFixed(1)}% accuracy` : ''}
                      </div>
                    </div>
                    <div className="hidden sm:block flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, (agent.reputationScore / (agents[0]?.reputationScore || 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="text-sm font-mono text-emerald-400 w-16 text-right">{agent.reputationScore}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
