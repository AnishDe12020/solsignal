'use client';

export default function SignalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">Failed to load signal</div>
        <p className="text-zinc-400 mb-2">
          {error.message || 'Could not fetch signal details from chain.'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
          <a href="/" className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors">
            Back to Signals
          </a>
        </div>
      </div>
    </div>
  );
}
