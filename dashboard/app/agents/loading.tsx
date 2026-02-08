export default function AgentsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="skeleton h-9 w-56 mb-2" />
          <div className="skeleton h-5 w-96 max-w-full" />
        </div>
        <div className="skeleton h-10 w-64 rounded-lg" />
      </div>

      {/* Podium skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center ${i === 2 ? 'md:-mt-4' : 'md:mt-4'}`}>
            <div className="skeleton h-5 w-8 mx-auto mb-2" />
            <div className="skeleton w-14 h-14 rounded-full mx-auto mb-3" />
            <div className="skeleton h-5 w-20 mx-auto mb-1" />
            <div className="skeleton h-6 w-12 mx-auto mt-1" />
            <div className="skeleton h-4 w-24 mx-auto mt-3" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-0">
        <div className="border-b border-zinc-800 pb-4 flex gap-4">
          {['w-16', 'w-40', 'w-16', 'w-20', 'w-20', 'w-32', 'w-24'].map((w, i) => (
            <div key={i} className={`skeleton h-4 ${w}`} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-zinc-800/50 py-4 flex items-center gap-4">
            <div className="skeleton h-6 w-10" />
            <div className="flex items-center gap-3 flex-1">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div>
                <div className="skeleton h-5 w-20 mb-1" />
                <div className="skeleton h-3 w-28" />
              </div>
            </div>
            <div className="skeleton h-5 w-10" />
            <div className="skeleton h-5 w-16" />
            <div className="skeleton h-5 w-14" />
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
