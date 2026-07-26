import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cleanText, flatten, getText, SefariaNotFoundError } from "@/lib/sefaria";
import { viBook } from "@/lib/vi";
import { ReaderView } from "@/components/reader/ReaderView";
import { buildRef, isRefRefinement } from "@/lib/schema-resolver";
import { POPULAR_BOOKS } from "@/lib/popular-books";
import { SITE_URL } from "@/lib/site";

/**
 * Sefaria's own `data.sectionNames[0]` would give the precise unit name, but
 * that needs a request round-trip; the URL segment's own shape is enough to
 * tell integer chapters, Talmud daf, and named complex sections apart without
 * another fetch, and without changing the label for the already-correct
 * integer case.
 */
function unitLabelFor(segment: string): string {
  if (/^\d+[ab]$/i.test(segment)) return "Daf";
  if (/^\d+$/.test(segment)) return "Chương";
  return "Phần";
}

export const revalidate = 43200;
// Every other chapter still renders on-demand and is cached after its first
// request (ISR) — this only pins the Torah + Psalms + five Megillot + Pirkei
// Avot (all plain integer chapters, verified against the live API) to build
// time, matching src/app/sach/[book]/page.tsx's own generateStaticParams.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Next.js expects the raw (decoded) segment value here, not a pre-encoded
  // one — it handles URL-encoding internally when matching requests. Passing
  // an already-encoded string double-encodes multi-word titles (e.g. "Pirkei
  // Avot" -> "Pirkei%2520Avot"), which then fails to resolve against Sefaria.
  return POPULAR_BOOKS.flatMap(([title, chapterCount]) =>
    Array.from({ length: chapterCount }, (_, i) => ({
      book: title,
      chapter: String(i + 1),
    })),
  );
}

type Props = { params: Promise<{ book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter: rawChapter } = await params;
  const title = decodeURIComponent(book);
  const chapter = decodeURIComponent(rawChapter);
  const vi = viBook(title);
  const label = vi?.name ?? title;
  const unit = unitLabelFor(chapter);
  return {
    title: `${label} — ${unit} ${chapter}`,
    description: `Đọc toàn văn ${label} ${unit.toLowerCase()} ${chapter}, song ngữ Hebrew (מקרא על פי המסורה) và Anh, cung cấp bởi Sefaria.`,
    alternates: {
      canonical: `/doc/${encodeURIComponent(title)}/${encodeURIComponent(chapter)}`,
    },
    openGraph: {
      title: `${label} · ${unit} ${chapter} — Sifria`,
      description: vi?.blurb,
      type: "article",
    },
  };
}

export default async function ReaderPage({ params }: Props) {
  const { book, chapter: rawChapter } = await params;
  const title = decodeURIComponent(book);
  const chapter = decodeURIComponent(rawChapter);
  const ref = buildRef(title, chapter);

  let data;
  try {
    data = await getText(ref);
  } catch (e) {
    // Only a genuine not-found becomes a 404. An upstream failure (Sefaria
    // down/timed out) must NOT — that would look to search engines like the
    // book itself no longer exists and get real content deindexed.
    if (e instanceof SefariaNotFoundError) notFound();
    throw e;
  }

  // Sefaria sometimes accepts an out-of-range ref (e.g. "Berakhot 999") and
  // silently CLAMPS it to some other valid ref instead of erroring — this is
  // the crawler-trap bug where /doc/Berakhot/999, /5000, etc. all render the
  // same content as a real chapter with a fabricated "canonical" URL. Reject
  // anything Sefaria didn't resolve to the exact ref requested (or a deeper
  // refinement of it, e.g. a bare complex-node ref auto-resolving to its
  // first section).
  if (!isRefRefinement(ref, data.ref)) notFound();

  // A fully-specified single-verse ref (e.g. "... 1:2" — can happen via the
  // "Đọc từ đầu" lookahead skipping past empty sections) returns a plain
  // string instead of an array; normalize before flattening.
  const asArray = (v: string | string[] | string[][]): string[] | string[][] => (Array.isArray(v) ? v : [v]);
  const enLines = flatten(asArray(data.text)).map(cleanText);
  const heLines = flatten(asArray(data.he)).map(cleanText);
  const max = Math.max(enLines.length, heLines.length);
  const verses = Array.from({ length: max }, (_, i) => ({
    n: i + 1,
    he: heLines[i] ?? "",
    en: enLines[i] ?? "",
  }));

  const vi = viBook(title);
  const label = vi?.name ?? title;
  const unitLabel = unitLabelFor(chapter);
  const chapterIsNumeric = /^\d+$/.test(chapter);

  const prevRef = data.prev; // e.g., "Genesis 1"
  const nextRef = data.next;

  const linkFromRef = (r: string | null) => {
    if (!r) return null;
    // Sefaria refs look like "Genesis 2" or "Berakhot 2a"
    const idx = r.lastIndexOf(" ");
    if (idx === -1) return null;
    const b = r.slice(0, idx);
    const c = r.slice(idx + 1);
    return `/doc/${encodeURIComponent(b)}/${encodeURIComponent(c)}`;
  };

  const prevHref = linkFromRef(prevRef);
  const nextHref = linkFromRef(nextRef);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    isPartOf: {
      "@type": "Book",
      name: label,
      alternateName: data.heIndexTitle,
    },
    name: `${label} · ${unitLabel} ${chapter}`,
    position: chapterIsNumeric ? Number(chapter) : undefined,
    inLanguage: ["he", "en"],
    text: enLines.slice(0, 4).join(" "),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Thư viện", item: `${SITE_URL}/thu-vien` },
      { "@type": "ListItem", position: 3, name: label, item: `${SITE_URL}/sach/${encodeURIComponent(title)}` },
      {
        "@type": "ListItem",
        position: 4,
        name: `${unitLabel} ${chapter}`,
        item: `${SITE_URL}/doc/${encodeURIComponent(title)}/${encodeURIComponent(chapter)}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pb-24 pt-8 sm:px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.28em] text-parchment/50">
        <div>
          <Link href="/" className="hover:text-[#d4af37]">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link href="/thu-vien" className="hover:text-[#d4af37]">
            Thư viện
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/sach/${encodeURIComponent(title)}`}
            className="hover:text-[#d4af37]"
          >
            {label}
          </Link>
        </div>
        <span className="text-[#d4af37]">{unitLabel} {chapter}</span>
      </nav>

      <header className="rise mb-6 text-center">
        <p className="font-hebrew text-2xl text-[#d4af37]" dir="rtl">
          {data.heRef}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          <span className="text-gradient-gold">{label}</span>{" "}
          <span className="text-parchment">· {unitLabel} {chapter}</span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.28em] text-parchment/60">
          {verses.length} câu · Song ngữ Hebrew / English
        </p>
      </header>

      <div className="divider-ornate mb-8" />

      <ReaderView book={title} chapter={chapter} label={label} heTitle={data.heIndexTitle} verses={verses} />

      <p className="mt-6 text-center text-[11px] italic text-parchment/50">
        Bản Hebrew: <em>Miqra according to the Masorah</em> (CC-BY-SA) · Bản dịch Anh:{" "}
        {data.versionTitle ?? "JPS Tanakh"}. Cung cấp bởi{" "}
        <a
          href="https://www.sefaria.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Sefaria.org
        </a>
        .
      </p>

      {/* NAV */}
      <nav className="mt-10 grid gap-4 sm:grid-cols-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="glass card-3d group block rounded-2xl p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/70">
              ← Chương trước
            </p>
            <p className="mt-2 font-display text-xl text-parchment">
              {prevRef}
            </p>
          </Link>
        ) : (
          <div />
        )}
        {nextHref && (
          <Link
            href={nextHref}
            className="glass card-3d group block rounded-2xl p-5 text-right"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/70">
              Chương tiếp →
            </p>
            <p className="mt-2 font-display text-xl text-parchment">
              {nextRef}
            </p>
          </Link>
        )}
      </nav>

      <div className="mt-10 text-center">
        <Link
          href={`/sach/${encodeURIComponent(title)}`}
          className="btn-outline text-sm"
        >
          ↑ Về mục lục “{label}”
        </Link>
      </div>
    </div>
  );
}
