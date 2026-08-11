import Link from "next/link";
import { Logo } from "./Logo";
import { SearchForm } from "./SearchForm";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/library", label: "Thư viện" },
  { href: "/book/Genesis", label: "Sáng Thế" },
  { href: "/book/Psalms", label: "Thi Thiên" },
  { href: "/about", label: "Về Sifria" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d4af37]/15 bg-[#06080f]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-4 py-2 text-sm text-parchment/80 transition hover:bg-[#d4af37]/10 hover:text-parchment"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <SearchForm compact />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="btn-outline hidden text-sm sm:inline-flex"
          >
            Duyệt thư viện
          </Link>
          <Link
            href="/read/Genesis/1"
            className="btn-gold text-sm"
            aria-label="Bắt đầu đọc"
          >
            <span aria-hidden>✦</span> Bắt đầu đọc
          </Link>
        </div>
      </div>
      {/* mobile nav strip */}
      <div className="border-t border-[#d4af37]/10 lg:hidden">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-full border border-[#d4af37]/20 px-3 py-1 text-xs text-parchment/80 hover:border-[#d4af37]/60"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/search"
            className="whitespace-nowrap rounded-full border border-[#d4af37]/20 px-3 py-1 text-xs text-parchment/80 hover:border-[#d4af37]/60 md:hidden"
          >
            🔍 Tìm kiếm
          </Link>
        </div>
      </div>
    </header>
  );
}
