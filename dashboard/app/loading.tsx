export default function Loading() {
  return (
    <div className="space-y-12">
      {/* Hero skeleton */}
      <section className="text-center py-12 md:py-20">
        <div className="skeleton h-6 w-40 mx-auto mb-6 rounded-full" />
        <div className="skeleton h-12 w-96 max-w-full mx-auto mb-4" />
        <div className="skeleton h-12 w-80 max-w-full mx-auto mb-4" />
        <div className="skeleton h-6 w-[28rem] max-w-full mx-auto mb-8" />
        <div className="flex items-center justify-center gap-8 md:gap-16 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="skeleton h-12 w-20 mx-auto mb-2" />
              <div className="skeleton h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="skeleton h-12 w-40 rounded-lg" />
          <div className="skeleton h-12 w-40 rounded-lg" />
          <div className="skeleton h-12 w-44 rounded-lg" />
        </div>
      </section>

      {/* How it works skeleton */}
      <section className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="skeleton w-8 h-8 rounded-full mb-3" />
            <div className="skeleton h-5 w-28 mb-2" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4 mt-1" />
          </div>
        ))}
      </section>

      {/* Signals skeleton */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="skeleton h-7 w-36 mb-2" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="skeleton h-9 w-48 rounded-lg" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded" />
                  <div>
                    <div className="skeleton h-5 w-24 mb-1" />
                    <div className="skeleton h-4 w-20" />
                  </div>
                </div>
                <div className="skeleton h-7 w-16 rounded" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j}>
                    <div className="skeleton h-4 w-16 mb-1" />
                    <div className="skeleton h-5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
