import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cleanText, flatten, getText } from "@/lib/sefaria";
import { viBook } from "@/lib/vi";

export const revalidate = 43200;

type Props = { params: Promise<{ book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book, chapter } = await params;
  const title = decodeURIComponent(book);
  const vi = viBook(title);
  const label = vi?.name ?? title;
  return {
    title: `${label} — Chương ${chapter}`,
    description: `Đọc toàn văn ${label} chương ${chapter}, song ngữ Hebrew (מקרא על פי המסורה) và Anh, cung cấp bởi Sefaria.`,
    alternates: {
      canonical: `/doc/${encodeURIComponent(title)}/${chapter}`,
    },
    openGraph: {
      title: `${label} · Chương ${chapter} — Sifria`,
      description: vi?.blurb,
      type: "article",
    },
  };
}

export default async function ReaderPage({ params }: Props) {
  const { book, chapter } = await params;
  const title = decodeURIComponent(book);
  const ref = `${title} ${chapter}`;

  let data;
  try {
    data = await getText(ref);
  } catch {
    notFound();
  }

  const enLines = flatten(data.text).map(cleanText);
  const heLines = flatten(data.he).map(cleanText);
  const max = Math.max(enLines.length, heLines.length);
  const verses = Array.from({ length: max }, (_, i) => ({
    n: i + 1,
    he: heLines[i] ?? "",
    en: enLines[i] ?? "",
  }));

  const vi = viBook(title);
  const label = vi?.name ?? title;
  const chapterNum = Number(chapter);

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
    name: `${label} · Chương ${chapterNum}`,
    position: chapterNum,
    inLanguage: ["he", "en"],
    text: enLines.slice(0, 4).join(" "),
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pb-24 pt-8 sm:px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
        <span className="text-[#d4af37]">Chương {chapterNum}</span>
      </nav>

      <header className="rise mb-6 text-center">
        <p className="font-hebrew text-2xl text-[#d4af37]" dir="rtl">
          {data.heRef}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          <span className="text-gradient-gold">{label}</span>{" "}
          <span className="text-parchment">· Chương {chapterNum}</span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.28em] text-parchment/60">
          {verses.length} câu · Song ngữ Hebrew / English
        </p>
      </header>

      <div className="divider-ornate mb-8" />

      {/* PARCHMENT SCROLL */}
      <article className="parchment relative rounded-[28px] p-6 sm:p-10 lg:p-14">
        {/* corner ornaments */}
        <div className="pointer-events-none absolute inset-x-6 top-3 h-[2px] bg-gradient-to-r from-transparent via-[#a37d1a]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-6 bottom-3 h-[2px] bg-gradient-to-r from-transparent via-[#a37d1a]/50 to-transparent" />

        {verses.length === 0 ? (
          <p className="text-center italic">
            Đoạn này chưa có nội dung khả dụng qua API Sefaria.
          </p>
        ) : (
          <ol className="space-y-1">
            {verses.map((v) => (
              <li key={v.n} className="verse" id={`v${v.n}`}>
                <span className="verse-num">
                  <span className="font-hebrew" dir="rtl">{v.n}.</span>
                </span>
                <div>
                  {v.he && (
                    <p className="verse-he" dir="rtl">
                      {v.he}
                    </p>
                  )}
                  {v.en && <p className="verse-en">{v.en}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}

        <footer className="mt-10 border-t border-[#a37d1a]/30 pt-4 text-center text-[11px] italic text-[#4a3d1c]">
          Bản Hebrew:{" "}
          <em>Miqra according to the Masorah</em> (CC-BY-SA) · Bản dịch Anh:{" "}
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
        </footer>
      </article>

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
