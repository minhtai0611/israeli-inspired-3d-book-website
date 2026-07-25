import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookIndex, getText } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { toHebrewNumeral } from "@/lib/hebrew-numeral";

export const revalidate = 43200;

type Props = { params: Promise<{ book: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book } = await params;
  const title = decodeURIComponent(book);
  const vi = viBook(title);
  const label = vi?.name ?? title;
  return {
    title: `${label} — Đọc trực tuyến song ngữ Hebrew · Việt`,
    description:
      vi?.blurb ??
      `Đọc toàn văn ${title} — bản Hebrew Masoretic và bản dịch tiếng Anh chính thức từ Sefaria, hiển thị theo chương một cách trang nhã.`,
    alternates: { canonical: `/sach/${encodeURIComponent(title)}` },
  };
}

export default async function BookPage({ params }: Props) {
  const { book } = await params;
  const title = decodeURIComponent(book);

  let index;
  try {
    index = await getBookIndex(title);
  } catch {
    notFound();
  }

  // Try to fetch the first section to derive chapter count if not exposed
  let chapterCount =
    index.lengths?.[0] ??
    index.schema?.lengths?.[0] ??
    0;

  let firstSectionName = index.sectionNames?.[0] ?? index.schema?.sectionNames?.[0] ?? "Chương";
  const heSectionNames = index.schema?.heSectionNames?.[0] ?? "";

  if (!chapterCount) {
    try {
      const first = await getText(title);
      chapterCount = first.lengths?.[0] ?? first.length ?? 0;
      if (!firstSectionName || firstSectionName === "Chương") {
        firstSectionName = first.sectionNames?.[0] ?? "Chương";
      }
    } catch {
      chapterCount = 0;
    }
  }

  const vi = viBook(title);
  const label = vi?.name ?? title;
  const topCat = index.categories?.[0];
  const catMeta = topCat ? viCategory(topCat) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: label,
    alternateName: [title, index.heTitle],
    inLanguage: ["he", "en"],
    numberOfPages: chapterCount || undefined,
    genre: topCat,
    description: vi?.blurb ?? index.enShortDesc ?? index.enDesc,
    author: index.authors?.map((a) => ({ "@type": "Person", name: a.en })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-xs uppercase tracking-[0.28em] text-parchment/50">
        <Link href="/" className="hover:text-[#d4af37]">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/thu-vien" className="hover:text-[#d4af37]">Thư viện</Link>
        {topCat && (
          <>
            <span className="mx-2">/</span>
            <span className="text-[#d4af37]">{catMeta?.name ?? topCat}</span>
          </>
        )}
      </nav>

      <header className="rise mb-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-hebrew text-3xl text-[#d4af37]" dir="rtl">
            {index.heTitle}
          </p>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl">
            <span className="text-gradient-gold">{label}</span>
          </h1>
          {(vi?.blurb || index.enShortDesc || index.enDesc) && (
            <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-parchment/80">
              {vi?.blurb ?? index.enShortDesc ?? index.enDesc}
            </p>
          )}
          {index.authors && index.authors.length > 0 && (
            <p className="mt-3 text-sm text-parchment/60">
              Tác giả/biên soạn:{" "}
              {index.authors.map((a) => a.en).join(", ")}
            </p>
          )}
          {index.compPlace && (
            <p className="text-sm text-parchment/60">
              Địa điểm biên soạn: {index.compPlace}
            </p>
          )}
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">
            Cấu trúc
          </p>
          <p className="mt-2 font-display text-4xl text-parchment">
            {chapterCount || "—"}
          </p>
          <p className="text-xs text-parchment/60">
            {firstSectionName}
            {heSectionNames && ` · ${heSectionNames}`}
          </p>
          <Link
            href={`/doc/${encodeURIComponent(title)}/1`}
            className="btn-gold mt-4 !py-2 !text-xs"
          >
            Đọc từ đầu
          </Link>
        </div>
      </header>

      <div className="divider-ornate mb-10" />

      <section>
        <h2 className="mb-6 font-display text-3xl">
          Mục lục <span className="text-gradient-gold">{firstSectionName}</span>
        </h2>

        {chapterCount > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
              <li key={ch}>
                <Link
                  href={`/doc/${encodeURIComponent(title)}/${ch}`}
                  className="glass card-3d group flex aspect-[4/5] flex-col items-center justify-center rounded-2xl text-center transition"
                >
                  <span className="font-hebrew text-3xl text-[#d4af37]/70 transition group-hover:text-[#d4af37]">
                    {toHebrewNumeral(ch)}
                  </span>
                  <span className="mt-2 font-display text-2xl text-parchment">
                    {ch}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-parchment/50">
                    {firstSectionName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Bộ sách này có cấu trúc phức tạp. Hãy mở{" "}
            <Link
              href={`/doc/${encodeURIComponent(title)}/1`}
              className="text-[#d4af37] underline"
            >
              phần đầu tiên
            </Link>{" "}
            và điều hướng bằng nút “tiếp / trước” trong trình đọc.
          </p>
        )}
      </section>
    </div>
  );
}

