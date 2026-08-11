import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookIndex, getText } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { resolveStructure, buildIntegerItems, findFirstReadableRef } from "@/lib/schema-resolver";
import { categorySlug } from "@/lib/library";
import { POPULAR_BOOKS } from "@/lib/popular-books";
import { SITE_URL } from "@/lib/site";
import { GlossaryText } from "@/components/GlossaryText";

export const revalidate = 43200;
// Everything outside POPULAR_BOOKS still renders on-demand and is cached
// after its first request (ISR) — this only pins the highest-traffic titles
// to build time so they're served from the CDN immediately.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Next.js expects the raw (decoded) segment value here, not a pre-encoded
  // one — it handles URL-encoding internally when matching requests. Passing
  // an already-encoded string double-encodes multi-word titles (e.g. "Pirkei
  // Avot" -> "Pirkei%2520Avot"), which then fails to resolve against Sefaria.
  return POPULAR_BOOKS.map(([title]) => ({ book: title }));
}

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
    alternates: { canonical: `/book/${encodeURIComponent(title)}` },
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

  let structure = resolveStructure(index, title);

  // Rare edge case: Sefaria's raw index exposed neither `schema.lengths` nor
  // `schema.nodes`. Fall back to fetching the bare title, mirroring the
  // pre-existing rescue path, so this book still gets an integer-style TOC
  // instead of a dead end.
  if (structure.kind === "unknown") {
    try {
      const first = await getText(title);
      const len = first.lengths?.[0] ?? first.length ?? 0;
      if (len > 0) {
        structure = buildIntegerItems(title, len, first.sectionNames?.[0] ?? "Chương");
      }
    } catch {
      // leave structure as "unknown" — the fallback message below covers it
    }
  }

  const chapterCount = structure.items.length;
  const firstSectionName = structure.unitName;

  // The structurally-first section (e.g. daf 2a) is sometimes genuinely empty
  // in Sefaria's data (sparse commentaries) — follow `next` to real content so
  // "Đọc từ đầu" never lands on a blank page.
  const readableFirst = await findFirstReadableRef(structure, getText);
  const startHref = readableFirst
    ? `/read/${encodeURIComponent(title)}/${encodeURIComponent(readableFirst.segment)}`
    : null;

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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Thư viện", item: `${SITE_URL}/library` },
      ...(topCat
        ? [{
            "@type": "ListItem",
            position: 3,
            name: catMeta?.name ?? topCat,
            item: `${SITE_URL}/library/${categorySlug(topCat)}`,
          }]
        : []),
      {
        "@type": "ListItem",
        position: topCat ? 4 : 3,
        name: label,
        item: `${SITE_URL}/book/${encodeURIComponent(title)}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="mb-6 text-xs uppercase tracking-[0.28em] text-parchment/60">
        <Link href="/" className="hover:text-[#d4af37]">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/library" className="hover:text-[#d4af37]">Thư viện</Link>
        {topCat && (
          <>
            <span className="mx-2">/</span>
            <span className="text-[#d4af37]">{catMeta?.name ?? topCat}</span>
          </>
        )}
      </nav>

      <header className="rise mb-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-hebrew text-3xl text-[#d4af37]" dir="rtl" lang="he">
            {index.heTitle}
          </p>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl">
            <span className="text-gradient-gold">{label}</span>
          </h1>
          {(vi?.blurb || index.enShortDesc || index.enDesc) && (
            <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-parchment/80">
              <GlossaryText text={vi?.blurb ?? index.enShortDesc ?? index.enDesc ?? ""} />
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
          </p>
          {startHref && (
            <Link href={startHref} className="btn-gold mt-4 !py-2 !text-xs">
              Đọc từ đầu
            </Link>
          )}
        </div>
      </header>

      <div className="divider-ornate mb-10" />

      <section>
        <h2 className="mb-6 font-display text-3xl">
          Mục lục <span className="text-gradient-gold">{firstSectionName}</span>
        </h2>

        {structure.items.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {structure.items.map((item) => (
              <li key={item.segment}>
                <Link
                  href={`/read/${encodeURIComponent(title)}/${encodeURIComponent(item.segment)}`}
                  className="glass card-3d group flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center transition"
                >
                  {item.heLabel && (
                    <span
                      className="font-hebrew text-2xl text-[#d4af37]/70 transition group-hover:text-[#d4af37]"
                      dir="rtl"
                      lang="he"
                    >
                      {item.heLabel}
                    </span>
                  )}
                  <span className="font-display text-lg text-parchment">
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-2xl p-6 text-center text-parchment/70">
            Sách này chưa xác định được cấu trúc chương/mục từ Sefaria. Hãy quay lại{" "}
            <Link href="/library" className="text-[#d4af37] underline">
              thư viện
            </Link>{" "}
            để chọn một cuốn khác.
          </p>
        )}
      </section>
    </div>
  );
}

