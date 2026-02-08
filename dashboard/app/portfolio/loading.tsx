export default function PortfolioLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="skeleton h-64 rounded-lg" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
      <div className="skeleton h-48 rounded-lg" />
    </div>
  );
}
