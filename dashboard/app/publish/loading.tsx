export default function PublishLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <div className="skeleton h-9 w-44 mb-2" />
        <div className="skeleton h-5 w-96 max-w-full" />
      </div>

      <div className="skeleton h-14 w-full rounded-lg" />

      {/* Wallet connection skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="skeleton h-4 w-56 mb-1" />
          <div className="skeleton h-3 w-40" />
        </div>
        <div className="skeleton h-10 w-36 rounded-lg" />
      </div>

      {/* Form fields skeleton */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="skeleton h-4 w-20 mb-2" />
          <div className="skeleton h-12 w-full rounded-lg" />
        </div>
        <div>
          <div className="skeleton h-4 w-20 mb-2" />
          <div className="grid grid-cols-2 gap-2">
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      <div>
        <div className="skeleton h-4 w-28 mb-2" />
        <div className="skeleton h-3 w-full rounded-full" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton h-4 w-24 mb-2" />
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div>
        <div className="skeleton h-4 w-24 mb-2" />
        <div className="skeleton h-12 w-full rounded-lg" />
      </div>

      <div>
        <div className="skeleton h-4 w-36 mb-2" />
        <div className="skeleton h-28 w-full rounded-lg" />
      </div>

      <div className="skeleton h-14 w-full rounded-lg" />
    </div>
  );
}
