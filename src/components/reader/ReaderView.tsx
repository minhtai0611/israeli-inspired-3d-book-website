"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getReaderPrefsServerSnapshot,
  getReaderPrefsSnapshot,
  recordVisit,
  setReaderPrefs,
  subscribeReaderPrefs,
  type ReaderPrefs,
} from "@/lib/reader-storage";

type Verse = { n: number; he: string; en: string };

const LINE_SPACING_CLASS: Record<ReaderPrefs["lineSpacing"], string> = {
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
};

const LINE_SPACING_LABEL: Record<ReaderPrefs["lineSpacing"], string> = {
  normal: "Dòng: Thường",
  relaxed: "Dòng: Giãn",
  loose: "Dòng: Rộng",
};

function nextLineSpacing(current: ReaderPrefs["lineSpacing"]): ReaderPrefs["lineSpacing"] {
  if (current === "normal") return "relaxed";
  if (current === "relaxed") return "loose";
  return "normal";
}

export function ReaderView({
  book,
  chapter,
  label,
  heTitle,
  verses,
}: {
  book: string;
  chapter: number;
  label: string;
  heTitle: string;
  verses: Verse[];
}) {
  const prefs = useSyncExternalStore(
    subscribeReaderPrefs,
    getReaderPrefsSnapshot,
    getReaderPrefsServerSnapshot,
  );
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    recordVisit({ book, chapter, label, heTitle });
  }, [book, chapter, label, heTitle]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  function update(partial: Partial<ReaderPrefs>) {
    setReaderPrefs({ ...prefs, ...partial });
  }

  async function copyVerseLink(n: number) {
    const url = `${window.location.origin}${window.location.pathname}#v${n}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedVerse(n);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopiedVerse(null), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  }

  return (
    <div>
      {/* READER CONTROLS */}
      <div
        role="group"
        aria-label="Tùy chỉnh trình đọc"
        className="glass mb-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl p-3 text-xs"
      >
        <div className="flex items-center gap-1" role="group" aria-label="Cỡ chữ">
          <button
            type="button"
            className="btn-outline !px-3 !py-1.5"
            onClick={() => update({ fontScale: Math.max(0.85, +(prefs.fontScale - 0.1).toFixed(2)) })}
            aria-label="Giảm cỡ chữ"
          >
            A−
          </button>
          <button
            type="button"
            className="btn-outline !px-3 !py-1.5"
            onClick={() => update({ fontScale: Math.min(1.3, +(prefs.fontScale + 0.1).toFixed(2)) })}
            aria-label="Tăng cỡ chữ"
          >
            A+
          </button>
        </div>

        <button
          type="button"
          className="btn-outline !px-3 !py-1.5"
          onClick={() => update({ lineSpacing: nextLineSpacing(prefs.lineSpacing) })}
        >
          {LINE_SPACING_LABEL[prefs.lineSpacing]}
        </button>

        <div className="flex items-center gap-1" role="group" aria-label="Hiển thị ngôn ngữ">
          {(["both", "he", "en"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={prefs.mode === m}
              onClick={() => update({ mode: m })}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                prefs.mode === m
                  ? "bg-[#d4af37] text-[#14100a] font-semibold"
                  : "border border-[#d4af37]/40 text-parchment/80 hover:border-[#d4af37]"
              }`}
            >
              {m === "both" ? "HE + EN" : m === "he" ? "Chỉ Hebrew" : "Chỉ English"}
            </button>
          ))}
        </div>
      </div>

      {/* PARCHMENT SCROLL */}
      <article className="parchment relative rounded-[28px] p-6 sm:p-10 lg:p-14">
        <div className="pointer-events-none absolute inset-x-6 top-3 h-[2px] bg-gradient-to-r from-transparent via-[#a37d1a]/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-6 bottom-3 h-[2px] bg-gradient-to-r from-transparent via-[#a37d1a]/50 to-transparent" />

        {verses.length === 0 ? (
          <p className="text-center italic">
            Đoạn này chưa có nội dung khả dụng qua API Sefaria.
          </p>
        ) : (
          <ol className="space-y-1" style={{ fontSize: `${prefs.fontScale}em` }}>
            {verses.map((v) => (
              <li key={v.n} className="verse group" id={`v${v.n}`}>
                <span className="verse-num flex flex-col items-center gap-1">
                  <span className="font-hebrew" dir="rtl">{v.n}.</span>
                  <button
                    type="button"
                    onClick={() => copyVerseLink(v.n)}
                    className="text-[10px] leading-none text-[#a37d1a]/50 opacity-0 transition hover:text-[#a37d1a] focus-visible:opacity-100 group-hover:opacity-100"
                    aria-label={`Sao chép liên kết câu ${v.n}`}
                    title="Sao chép liên kết"
                  >
                    {copiedVerse === v.n ? "✓" : "🔗"}
                  </button>
                </span>
                <div className={LINE_SPACING_CLASS[prefs.lineSpacing]}>
                  {v.he && prefs.mode !== "en" && (
                    <p className="verse-he" dir="rtl">
                      {v.he}
                    </p>
                  )}
                  {v.en && prefs.mode !== "he" && <p className="verse-en">{v.en}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
}
