export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-500">Loading autonomous pipeline status...</p>
      </div>
    </div>
  );
}
