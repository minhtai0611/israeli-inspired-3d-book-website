import Link from "next/link";
import type { Metadata } from "next";
import { getIndex, getText, searchVerses, cleanText, type VerseSearchHit } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { flattenBooks, searchBooks } from "@/lib/library";
import { getReadableBooksFromDb } from "@/lib/library-db";
import { SearchForm } from "@/components/SearchForm";
import { segmentFromRef } from "@/lib/schema-resolver";

export const revalidate = 86400;

type Props = { searchParams: Promise<{ q?: string; mode?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Tìm “${q}”` : "Tìm kiếm sách",
    description: "Tìm sách trong thư viện Sifria theo tên tiếng Anh, tiếng Hebrew, hoặc tên tiếng Việt.",
    alternates: { canonical: q ? `/search?q=${encodeURIComponent(q)}` : "/search" },
    robots: { index: false, follow: true },
  };
}

/** Verse-search result card content: canonical bilingual text for one search hit's ref. */
type VerseResultCard = {
  ref: string;
  heRef: string;
  book: string;
  chapterHref: string | null;
  he: string;
  en: string;
};

function highlightMatches(text: string, query: string) {
  if (!text || !query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[#d4af37]/30 px-0.5 text-parchment">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

/** Dedupes hits by ref (a verse can match once per translation/version) and resolves each to canonical bilingual text. */
async function resolveVerseCards(hits: VerseSearchHit[]): Promise<VerseResultCard[]> {
  const uniqueRefs = [...new Set(hits.map((h) => h.ref))];
  const settled = await Promise.all(
    uniqueRefs.map(async (ref) => {
      try {
        const data = await getText(ref);
        const asText = (v: string | string[] | string[][]): string => (typeof v === "string" ? v : "");
        const segment = segmentFromRef(data.ref, data.indexTitle);
        // segmentFromRef falls back to returning the ref unchanged when it doesn't start with
        // indexTitle (unexpected shape) — treat that as "couldn't build a link" like ReaderPage does.
        const chapterHref =
          segment !== data.ref
            ? `/read/${encodeURIComponent(data.indexTitle)}/${encodeURIComponent(segment)}`
            : null;
        return {
          ref,
          heRef: data.heRef,
          book: data.indexTitle,
          chapterHref,
          he: cleanText(asText(data.he)),
          en: cleanText(asText(data.text)),
        } satisfies VerseResultCard;
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((c): c is VerseResultCard => c !== null);
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", mode: rawMode, page: rawPage } = await searchParams;
  const trimmed = q.trim();
  const mode = rawMode === "verse" ? "verse" : "title";
  const page = Math.max(1, Number(rawPage) || 1);

  let results: ReturnType<typeof searchBooks> = [];
  let verseCards: VerseResultCard[] = [];
  let verseTotal = 0;
  let error = false;

  if (trimmed && mode === "verse") {
    try {
      const { total, hits } = await searchVerses(trimmed, page);
      verseTotal = total;
      verseCards = await resolveVerseCards(hits);
    } catch {
      error = true;
    }
  } else if (trimmed) {
    let books;
    try {
      books = await getReadableBooksFromDb();
      if (books.length === 0) throw new Error("DB returned no readable books — sync may not have run yet");
    } catch {
      try {
        books = flattenBooks(await getIndex());
      } catch {
        error = true;
      }
    }
    if (books) results = searchBooks(books, trimmed);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 lg:px-10">
      <div className="mb-10 rise">
        <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Sifria · Tìm kiếm</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          {mode === "verse" ? (
            <>Tìm <span className="text-gradient-gold">trong câu Kinh văn</span></>
          ) : (
            <>Tìm <span className="text-gradient-gold">tên sách</span></>
          )}
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-lg text-parchment/70">
          {mode === "verse"
            ? "Tìm một từ hoặc cụm từ xuất hiện trong chính văn bản Kinh thánh, song ngữ Hebrew – Anh."
            : "Gõ tên sách bằng tiếng Anh, tiếng Hebrew, hoặc tên tiếng Việt — ví dụ “Genesis”, “Psalms”, hoặc “Thi Thiên”."}
        </p>
      </div>

      <SearchForm defaultValue={trimmed} defaultMode={mode} />

      <div className="mt-10">
        {!trimmed && (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Nhập từ khóa phía trên để bắt đầu tìm kiếm.
          </p>
        )}

        {trimmed && error && (
          <div className="glass rounded-2xl p-6 text-center text-parchment/80">
            Không thể tải kết quả từ Sefaria lúc này. Xin thử lại sau vài phút.
          </div>
        )}

        {trimmed && mode === "verse" && !error && verseCards.length === 0 && (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Không tìm thấy câu nào khớp với “{trimmed}”.
          </p>
        )}

        {trimmed && mode === "verse" && verseCards.length > 0 && (
          <>
            <p className="mb-6 text-sm text-parchment/60">
              Khoảng {verseTotal.toLocaleString("vi-VN")} kết quả cho “{trimmed}” — trang {page}
            </p>
            <div className="space-y-4">
              {verseCards.map((c) => (
                <div key={c.ref} className="glass rounded-2xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                    {viBook(c.book)?.name ?? c.book} · {c.ref}
                  </p>
                  <p className="font-hebrew mt-2 text-lg text-[#d4af37]" dir="rtl" lang="he">
                    {highlightMatches(c.he, trimmed)}
                  </p>
                  <p className="mt-1 text-parchment/85" lang="en">
                    {highlightMatches(c.en, trimmed)}
                  </p>
                  {c.chapterHref && (
                    <Link href={c.chapterHref} className="mt-3 inline-block text-xs text-[#d4af37] underline">
                      Đọc toàn chương →
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <nav className="mt-8 flex justify-between text-sm">
              {page > 1 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(trimmed)}&mode=verse&page=${page - 1}`}
                  className="btn-outline"
                >
                  ← Trang trước
                </Link>
              ) : (
                <span />
              )}
              {page * 10 < verseTotal && (
                <Link
                  href={`/search?q=${encodeURIComponent(trimmed)}&mode=verse&page=${page + 1}`}
                  className="btn-outline"
                >
                  Trang tiếp →
                </Link>
              )}
            </nav>
          </>
        )}

        {trimmed && mode === "title" && !error && results.length === 0 && (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Không tìm thấy sách nào khớp với “{trimmed}”.{" "}
            <Link href="/library" className="text-[#d4af37] underline">
              Duyệt toàn bộ thư viện
            </Link>{" "}
            thay vào đó.
          </p>
        )}

        {trimmed && mode === "title" && results.length > 0 && (
          <>
            <p className="mb-6 text-sm text-parchment/60">
              {results.length} kết quả cho “{trimmed}”
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((b) => {
                const vi = viBook(b.title);
                const cat = viCategory(b.categoryPath[0] ?? "");
                return (
                  <Link
                    key={b.title}
                    href={`/book/${encodeURIComponent(b.title)}`}
                    className="card-3d glass group relative overflow-hidden rounded-2xl p-5"
                  >
                    <div className="card-inner">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                        {cat.name}
                      </p>
                      <p className="font-hebrew mt-1 text-2xl text-[#d4af37]" dir="rtl" lang="he">
                        {b.heTitle}
                      </p>
                      <h3 className="mt-1 font-display text-xl text-parchment">
                        {vi?.name ?? b.title}
                      </h3>
                      {(vi?.blurb || b.shortDesc) && (
                        <p className="mt-2 line-clamp-2 text-xs text-parchment/65">
                          {vi?.blurb ?? b.shortDesc}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
