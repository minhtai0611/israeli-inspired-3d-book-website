export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-10" aria-hidden="true">
      <div className="glass mb-3 h-10 w-1/2 animate-pulse rounded-lg" />
      <div className="glass mb-10 h-5 w-2/3 animate-pulse rounded-lg" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="glass h-16 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
