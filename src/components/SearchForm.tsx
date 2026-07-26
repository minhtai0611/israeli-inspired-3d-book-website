// Plain GET form to /tim-kiem — works with JS disabled, no client component needed.
export function SearchForm({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form
      role="search"
      action="/tim-kiem"
      method="get"
      className={compact ? "flex items-center gap-2" : "flex flex-wrap items-center gap-3"}
    >
      <label className="relative flex-1">
        <span className="sr-only">Tìm tên sách</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Tìm tên sách… (Genesis, Thi Thiên…)"
          className={
            compact
              ? "w-40 rounded-full border border-[#d4af37]/25 bg-[#0b1220]/60 px-4 py-1.5 text-sm text-parchment placeholder:text-parchment/60 focus-visible:border-[#d4af37] sm:w-56"
              : "w-full rounded-full border border-[#d4af37]/30 bg-[#0b1220]/60 px-5 py-3 text-base text-parchment placeholder:text-parchment/60 focus-visible:border-[#d4af37]"
          }
        />
      </label>
      <button type="submit" className={compact ? "btn-outline !py-1.5 text-xs" : "btn-gold"}>
        <span aria-hidden>🔍</span> Tìm
      </button>
    </form>
  );
}
