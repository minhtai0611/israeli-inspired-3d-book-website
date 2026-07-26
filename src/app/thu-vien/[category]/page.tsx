import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIndex } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import {
  categoryFromSlug,
  categorySlug,
  flattenBooks,
  groupByCategory,
  searchBooks,
  type FlatBook,
} from "@/lib/library";
import { getReadableBooksFromDb } from "@/lib/library-db";

export const revalidate = 86400;

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

async function loadCategory(slug: string) {
  let books: FlatBook[];
  let usedLiveFallback = false;
  try {
    books = await getReadableBooksFromDb();
    if (books.length === 0) throw new Error("DB returned no readable books — sync may not have run yet");
  } catch {
    books = flattenBooks(await getIndex());
    usedLiveFallback = true;
  }
  const grouped = groupByCategory(books);
  const category = categoryFromSlug(slug, [...grouped.keys()]);
  return { category, list: category ? grouped.get(category) ?? [] : [], usedLiveFallback };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const { q, sort, page } = await searchParams;
  let category: string | undefined;
  try {
    ({ category } = await loadCategory(slug));
  } catch {
    category = undefined;
  }
  if (!category) return { title: "Bộ sưu tập" };
  const meta = viCategory(category);
  // A filtered/sorted/paginated view is a duplicate of the canonical category
  // page for search engines — index only the plain, first-page view.
  const isFiltered = Boolean(q?.trim()) || sort === "az" || (page && page !== "1");
  return {
    title: `${meta.name} · Toàn bộ tác phẩm`,
    description: `${meta.desc} Duyệt toàn bộ tác phẩm trong bộ “${meta.name}”, tìm nhanh theo tên sách.`,
    alternates: { canonical: `/thu-vien/${categorySlug(category)}` },
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  const { q = "", sort, page = "1" } = await searchParams;

  let category: string | undefined;
  let list: FlatBook[] = [];
  let usedLiveFallback = false;
  try {
    ({ category, list, usedLiveFallback } = await loadCategory(slug));
  } catch {
    notFound();
  }
  if (!category) notFound();

  const meta = viCategory(category);
  const trimmedQ = q.trim();
  const sortAz = sort === "az";

  // Filtering/sorting/pagination all happen here, server-side, so the client
  // only ever receives the 24 books actually shown — not the whole category
  // (Halakhah alone has 2,169 books; shipping all of them to filter 24
  // client-side was the over-fetch this replaces).
  let filtered: FlatBook[] = trimmedQ ? searchBooks(list, trimmedQ, list.length) : list;
  if (sortAz) {
    filtered = [...filtered].sort((a, b) =>
      (viBook(a.title)?.name ?? a.title).localeCompare(viBook(b.title)?.name ?? b.title, "vi"),
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const buildHref = (overrides: { sort?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (trimmedQ) qs.set("q", trimmedQ);
    const nextSort = overrides.sort ?? (sortAz ? "az" : "");
    if (nextSort) qs.set("sort", nextSort);
    const nextPage = overrides.page ?? currentPage;
    if (nextPage > 1) qs.set("page", String(nextPage));
    const query = qs.toString();
    return `/thu-vien/${categorySlug(category!)}${query ? `?${query}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-10">
      <nav className="mb-6 text-xs uppercase tracking-[0.28em] text-parchment/60">
        <Link href="/" className="hover:text-[#d4af37]">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/thu-vien" className="hover:text-[#d4af37]">Thư viện</Link>
        <span className="mx-2">/</span>
        <span className="text-[#d4af37]">{meta.name}</span>
      </nav>

      <div className="mb-10 rise">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{meta.icon}</span>
          <h1 className="font-display text-4xl sm:text-5xl">
            <span className="text-gradient-gold">{meta.name}</span>
          </h1>
        </div>
        <p className="mt-4 max-w-2xl font-serif text-lg text-parchment/75">{meta.desc}</p>
        <p className="mt-2 text-sm text-parchment/60">{list.length} tác phẩm trong bộ này.</p>
      </div>

      <div className="divider-ornate mb-10" />

      {usedLiveFallback && (
        <p className="mb-8 text-center text-xs text-parchment/60">
          Đang hiển thị dữ liệu trực tiếp từ Sefaria (cơ sở dữ liệu tạm thời không phản hồi).
        </p>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-1 min-w-[220px] items-center gap-2">
          {sortAz && <input type="hidden" name="sort" value="az" />}
          <label className="relative flex-1">
            <span className="sr-only">Tìm sách trong bộ này</span>
            <input
              type="search"
              name="q"
              defaultValue={trimmedQ}
              placeholder="Tìm theo tên sách…"
              className="w-full rounded-full border border-[#d4af37]/30 bg-[#0b1220]/60 px-5 py-2.5 text-sm text-parchment placeholder:text-parchment/60 focus-visible:border-[#d4af37]"
            />
          </label>
          <button type="submit" className="btn-outline text-xs !py-2">
            <span aria-hidden>🔍</span> Tìm
          </button>
        </form>
        <Link
          href={buildHref({ sort: sortAz ? "" : "az", page: 1 })}
          className="btn-outline text-xs !py-2"
          aria-pressed={sortAz}
        >
          {sortAz ? "✓ Sắp xếp A–Z" : "Sắp xếp A–Z"}
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-parchment/60">
          {filtered.length} / {list.length} tác phẩm
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-parchment/70">
          Không tìm thấy sách phù hợp với “{trimmedQ}”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((b) => {
            const vi = viBook(b.title);
            return (
              <Link
                key={b.title}
                href={`/sach/${encodeURIComponent(b.title)}`}
                className="card-3d glass group relative overflow-hidden rounded-2xl p-5"
              >
                <div className="card-inner">
                  <p className="font-hebrew text-2xl text-[#d4af37]" dir="rtl" lang="he">
                    {b.heTitle}
                  </p>
                  <h3 className="mt-1 font-display text-xl text-parchment">
                    {vi?.name ?? b.title}
                  </h3>
                  {(vi?.blurb || b.shortDesc) && (
                    <p className="mt-2 line-clamp-3 text-xs text-parchment/65">
                      {vi?.blurb ?? b.shortDesc}
                    </p>
                  )}
                  <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                    {b.title} →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Phân trang">
          {currentPage > 1 ? (
            <Link href={buildHref({ page: currentPage - 1 })} className="btn-outline text-sm">
              ← Trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs uppercase tracking-[0.2em] text-parchment/60">
            Trang {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={buildHref({ page: currentPage + 1 })} className="btn-outline text-sm">
              Tiếp →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
