export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-3 pb-24 pt-8 sm:px-6 lg:px-10" aria-hidden="true">
      <div className="glass mb-6 h-8 w-2/3 animate-pulse rounded-lg" />
      <div className="parchment space-y-4 rounded-2xl p-6 sm:p-10">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-black/10" />
            <div className="h-6 w-full animate-pulse rounded bg-black/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
