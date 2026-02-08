'use client';

export default function PortfolioError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-zinc-400 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
      >
        Try again
      </button>
    </div>
  );
}
