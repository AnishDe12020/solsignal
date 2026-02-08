export default function SignalLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="skeleton h-4 w-28" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="skeleton w-12 h-12 rounded" />
          <div>
            <div className="skeleton h-8 w-32 mb-1" />
            <div className="skeleton h-4 w-48" />
          </div>
        </div>
        <div className="skeleton h-10 w-20 rounded-lg" />
      </div>

      {/* Status bar */}
      <div className="skeleton h-14 w-full rounded-lg" />

      {/* Price section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-4 w-24 mb-2" />
            <div className="skeleton h-9 w-36" />
          </div>
          <div className="text-right">
            <div className="skeleton h-4 w-24 mb-2" />
            <div className="skeleton h-9 w-28" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton h-3 w-28" />
          </div>
          <div className="skeleton h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="skeleton h-4 w-20 mb-2" />
            <div className="skeleton h-7 w-28 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Verification */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <div className="skeleton h-5 w-40 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
