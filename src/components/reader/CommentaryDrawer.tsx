"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { VerseLink } from "@/lib/sefaria";

/** Fetches/renders links for one verseRef — mounted fresh (via key) per verse so switching verses resets to "loading" without a manual setState reset in an effect. */
function CommentaryLinks({ verseRef }: { verseRef: string }) {
  const [links, setLinks] = useState<VerseLink[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/verse-links?ref=${encodeURIComponent(verseRef)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setLinks(data.ok ? data.links : []))
      .catch(() => setError(true));
    return () => controller.abort();
  }, [verseRef]);

  if (error) {
    return <p className="text-sm text-parchment/70">Không thể tải chú giải lúc này. Xin thử lại sau.</p>;
  }
  if (links === null) {
    return <p className="text-sm text-parchment/60">Đang tải…</p>;
  }
  if (links.length === 0) {
    return <p className="text-sm text-parchment/60">Không có chú giải cổ điển nào cho câu này.</p>;
  }
  return (
    <ul className="space-y-5">
      {links.map((l) => (
        <li key={l.ref} className="border-b border-[#d4af37]/15 pb-4 last:border-none">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]/80">{l.collectiveTitle.en}</p>
          {l.he && (
            <p className="font-hebrew mt-1 text-base text-parchment" dir="rtl" lang="he">
              {l.he}
            </p>
          )}
          {l.text && (
            <p className="mt-1 text-sm text-parchment/85" lang="en">
              {l.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Slide-over panel of classical commentary/Targum links for one verse ref, fetched via /api/verse-links. */
export function CommentaryDrawer({
  verseRef,
  onClose,
}: {
  /** The verse ref to show commentary for, or null when the drawer is closed. */
  verseRef: string | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const open = verseRef !== null;
  // Portal to document.body: RootLayout's <main className="relative z-10"> creates a
  // stacking context that a plain z-index bump can't escape (a fixed-position descendant's
  // z-index is only compared against siblings WITHIN that ancestor's stacking context, not
  // against <SiteHeader>'s z-50 sibling) — verified live 2026-07-31, the drawer's own header/
  // close button rendered visually and hit-test BEHIND SiteHeader despite z-[60] > z-50.
  // Mounted-via-useSyncExternalStore (not a plain `typeof document !== "undefined"` check,
  // and not a setState-in-effect either): a bare typeof check is false during SSR but true on
  // the very first CLIENT render too, so the client's initial render (which hydration compares
  // against the server HTML) would already try to render the portal while the server rendered
  // nothing — a genuine hydration mismatch (React error #418, confirmed live in production
  // 2026-08-02, not just a dev-mode warning). useSyncExternalStore's getServerSnapshot is used
  // for both the server render AND the client's hydration pass, so they match (both false);
  // only once hydration has committed does the client snapshot (always true) take over.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-[55] bg-black/50 transition-opacity motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={verseRef ? `Chú giải cho ${verseRef}` : "Chú giải"}
        className={`fixed right-0 top-0 z-[60] h-full w-full max-w-96 transform overflow-y-auto bg-[#0b1220] p-5 shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-parchment">Chú giải · {verseRef}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng chú giải"
            className="btn-outline !px-3 !py-1.5"
          >
            ✕
          </button>
        </div>

        {verseRef && <CommentaryLinks key={verseRef} verseRef={verseRef} />}
      </div>
    </>,
    document.body,
  );
}
