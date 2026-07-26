import Link from "next/link";
import type { Metadata } from "next";
import { getIndex } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { categorySlug, flattenBooks, groupByCategory, sortCategories, type FlatBook } from "@/lib/library";
import { getReadableBooksFromDb } from "@/lib/library-db";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Thư viện · Duyệt toàn bộ bộ sưu tập sách Israel",
  description:
    "Khám phá toàn bộ thư viện Sifria: Torah, Nabiim, Ketubim, Mishnah, Talmud, Kabbalah, Midrash, Halakhah, Chasidut và nhiều bộ khác — mỗi cuốn với chương mục đầy đủ.",
  alternates: { canonical: "/thu-vien" },
};

export default async function LibraryPage() {
  let books: FlatBook[] = [];
  let error = false;
  let usedLiveFallback = false;
  try {
    books = await getReadableBooksFromDb();
    if (books.length === 0) throw new Error("DB returned no readable books — sync may not have run yet");
  } catch {
    try {
      books = flattenBooks(await getIndex());
      usedLiveFallback = true;
    } catch {
      error = true;
    }
  }

  const grouped = groupByCategory(books);
  const sorted = sortCategories([...grouped.entries()]);
  const totalBooks = books.length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-10">
      <div className="mb-14 rise">
        <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
          Sifria · Thư viện
        </p>
        <h1 className="mt-2 font-display text-5xl sm:text-6xl">
          <span className="text-gradient-gold">Mọi trang giấy</span> đợi bạn
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-lg text-parchment/75">
          Toàn bộ dữ liệu được cung cấp bởi{" "}
          <a
            href="https://www.sefaria.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d4af37] underline decoration-[#d4af37]/40 underline-offset-2"
          >
            Sefaria Open API
          </a>
          . Chọn bộ sưu tập, chọn cuốn sách, chọn chương — mỗi bản văn được
          hiển thị song ngữ Hebrew &amp; Anh, giữ nguyên đúng như bản gốc.
          {totalBooks > 0 && (
            <>
              {" "}Hiện có <strong className="text-parchment">{totalBooks}</strong>{" "}
              tác phẩm trong <strong className="text-parchment">{sorted.length}</strong>{" "}
              bộ sưu tập.
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="glass mb-10 rounded-2xl p-6 text-center text-parchment/80">
          Không thể tải chỉ mục từ Sefaria lúc này. Xin thử lại sau vài phút.
        </div>
      )}
      {usedLiveFallback && (
        <p className="mb-10 text-center text-xs text-parchment/60">
          Đang hiển thị dữ liệu trực tiếp từ Sefaria (cơ sở dữ liệu tạm thời không phản hồi).
        </p>
      )}

      <div className="space-y-16">
        {sorted.map(([cat, list]) => {
          const meta = viCategory(cat);
          const visible = list.slice(0, 24);
          return (
            <section key={cat} id={categorySlug(cat)}>
              <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d4af37]/20 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.icon}</span>
                  <div>
                    <h2 className="font-display text-3xl text-parchment sm:text-4xl">
                      {meta.name}
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-parchment/60">
                      {meta.desc}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/thu-vien/${categorySlug(cat)}`}
                  className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/70 hover:text-[#d4af37]"
                >
                  {list.length} tác phẩm →
                </Link>
              </header>

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
                        <p
                          className="font-hebrew text-2xl text-[#d4af37]"
                          dir="rtl"
                          lang="he"
                        >
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

              {list.length > visible.length && (
                <p className="mt-4 text-center text-xs text-parchment/60">
                  <Link
                    href={`/thu-vien/${categorySlug(cat)}`}
                    className="text-[#d4af37] underline decoration-[#d4af37]/40 underline-offset-2"
                  >
                    Xem thêm {list.length - visible.length} tác phẩm khác trong bộ “{meta.name}” →
                  </Link>
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
