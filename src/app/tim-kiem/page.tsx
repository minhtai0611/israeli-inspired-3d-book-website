import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { flattenBooks, searchBooks } from "@/lib/library";
import { SearchForm } from "@/components/SearchForm";

export const revalidate = 86400;

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Tìm “${q}”` : "Tìm kiếm sách",
    description: "Tìm sách trong thư viện Sifria theo tên tiếng Anh, tiếng Hebrew, hoặc tên tiếng Việt.",
    alternates: { canonical: q ? `/tim-kiem?q=${encodeURIComponent(q)}` : "/tim-kiem" },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const trimmed = q.trim();

  let results: ReturnType<typeof searchBooks> = [];
  let error = false;
  if (trimmed) {
    try {
      const nodes = await getIndex();
      const books = flattenBooks(nodes);
      results = searchBooks(books, trimmed);
    } catch {
      error = true;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 lg:px-10">
      <div className="mb-10 rise">
        <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">Sifria · Tìm kiếm</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Tìm <span className="text-gradient-gold">tên sách</span>
        </h1>
        <p className="mt-3 max-w-2xl font-serif text-lg text-parchment/70">
          Gõ tên sách bằng tiếng Anh, tiếng Hebrew, hoặc tên tiếng Việt — ví dụ “Genesis”,
          “Psalms”, hoặc “Thi Thiên”.
        </p>
      </div>

      <SearchForm defaultValue={trimmed} />

      <div className="mt-10">
        {!trimmed && (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Nhập tên sách phía trên để bắt đầu tìm kiếm.
          </p>
        )}

        {trimmed && error && (
          <div className="glass rounded-2xl p-6 text-center text-parchment/80">
            Không thể tải chỉ mục từ Sefaria lúc này. Xin thử lại sau vài phút.
          </div>
        )}

        {trimmed && !error && results.length === 0 && (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Không tìm thấy sách nào khớp với “{trimmed}”.{" "}
            <Link href="/thu-vien" className="text-[#d4af37] underline">
              Duyệt toàn bộ thư viện
            </Link>{" "}
            thay vào đó.
          </p>
        )}

        {trimmed && results.length > 0 && (
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
                    href={`/sach/${encodeURIComponent(b.title)}`}
                    className="card-3d glass group relative overflow-hidden rounded-2xl p-5"
                  >
                    <div className="card-inner">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                        {cat.name}
                      </p>
                      <p className="font-hebrew mt-1 text-2xl text-[#d4af37]" dir="rtl">
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
