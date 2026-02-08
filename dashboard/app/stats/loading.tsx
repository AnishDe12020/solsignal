export default function StatsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="skeleton h-9 w-52 mb-2" />
        <div className="skeleton h-5 w-80" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="skeleton h-4 w-20 mb-2" />
            <div className="skeleton h-8 w-16 mb-1" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="skeleton h-5 w-36 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="skeleton h-4 w-16" />
                  <div className="skeleton h-8 flex-1 rounded" />
                  <div className="skeleton h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Asset chart skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="skeleton h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-8 flex-1 rounded" />
              <div className="skeleton h-4 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Time chart skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="skeleton h-5 w-56 mb-4" />
        <div className="flex items-end gap-1 h-40">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="skeleton w-full rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
              <div className="skeleton h-3 w-6 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
