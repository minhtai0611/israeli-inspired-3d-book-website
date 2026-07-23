"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type BrowserBook = {
  title: string;
  heTitle: string;
  viName?: string;
  viBlurb?: string;
  shortDesc?: string;
};

const PAGE_SIZE = 24;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function CategoryBrowser({ books }: { books: BrowserBook[] }) {
  const [query, setQuery] = useState("");
  const [sortAz, setSortAz] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    let list = books;
    if (q) {
      list = books.filter((b) => {
        const haystack = normalize(
          [b.title, b.heTitle, b.viName, b.viBlurb, b.shortDesc].filter(Boolean).join(" "),
        );
        return haystack.includes(q);
      });
    }
    if (sortAz) {
      list = [...list].sort((a, b) => (a.viName ?? a.title).localeCompare(b.viName ?? b.title));
    }
    return list;
  }, [books, query, sortAz]);

  const visible = filtered.slice(0, shown);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Tìm sách trong bộ này</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder="Tìm theo tên sách…"
            className="w-full rounded-full border border-[#d4af37]/30 bg-[#0b1220]/60 px-5 py-2.5 text-sm text-parchment placeholder:text-parchment/40 focus-visible:border-[#d4af37]"
          />
        </label>
        <button
          type="button"
          onClick={() => setSortAz((v) => !v)}
          className="btn-outline text-xs !py-2"
          aria-pressed={sortAz}
        >
          {sortAz ? "✓ Sắp xếp A–Z" : "Sắp xếp A–Z"}
        </button>
        <span className="text-xs uppercase tracking-[0.2em] text-parchment/50">
          {filtered.length} / {books.length} tác phẩm
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-parchment/70">
          Không tìm thấy sách phù hợp với “{query}”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((b) => (
            <Link
              key={b.title}
              href={`/sach/${encodeURIComponent(b.title)}`}
              className="card-3d glass group relative overflow-hidden rounded-2xl p-5"
            >
              <div className="card-inner">
                <p className="font-hebrew text-2xl text-[#d4af37]" dir="rtl">
                  {b.heTitle}
                </p>
                <h3 className="mt-1 font-display text-xl text-parchment">
                  {b.viName ?? b.title}
                </h3>
                {(b.viBlurb || b.shortDesc) && (
                  <p className="mt-2 line-clamp-3 text-xs text-parchment/65">
                    {b.viBlurb ?? b.shortDesc}
                  </p>
                )}
                <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                  {b.title} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {shown < filtered.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE_SIZE)}
            className="btn-outline text-sm"
          >
            Tải thêm ({filtered.length - shown} còn lại)
          </button>
        </div>
      )}
    </div>
  );
}
