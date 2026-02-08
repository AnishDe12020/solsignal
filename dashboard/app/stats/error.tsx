'use client';

export default function StatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">Failed to load analytics</div>
        <p className="text-zinc-400 mb-2">
          {error.message || 'Could not fetch protocol analytics data.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
