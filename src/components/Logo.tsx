import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b3a6b] to-[#0b1220] shadow-[0_0_20px_rgba(212,175,55,.35)] ring-1 ring-[#d4af37]/40">
        <svg
          viewBox="0 0 64 64"
          className="h-8 w-8 transition-transform duration-700 group-hover:rotate-[8deg]"
          aria-hidden
        >
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7e39a" />
              <stop offset=".5" stopColor="#d4af37" />
              <stop offset="1" stopColor="#a37d1a" />
            </linearGradient>
          </defs>
          <g stroke="url(#lg)" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M32 18 V50" />
            <path d="M20 30 V50" />
            <path d="M26 24 V50" />
            <path d="M38 24 V50" />
            <path d="M44 30 V50" />
            <path d="M20 30 Q20 22 26 24" />
            <path d="M26 24 Q26 20 32 18" />
            <path d="M32 18 Q38 20 38 24" />
            <path d="M38 24 Q44 22 44 30" />
            <path d="M18 50 H46" />
            <path d="M28 54 H36" />
          </g>
          <g fill="#ffcf6b" className="flicker">
            <circle cx="20" cy="27" r="1.8" />
            <circle cx="26" cy="21" r="1.8" />
            <circle cx="32" cy="15" r="2" />
            <circle cx="38" cy="21" r="1.8" />
            <circle cx="44" cy="27" r="1.8" />
          </g>
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl tracking-wide text-gradient-gold">
            Sifria
          </span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
            Ánh Sáng Cổ Thư
          </span>
        </span>
      )}
    </Link>
  );
}
