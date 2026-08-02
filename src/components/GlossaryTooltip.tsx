"use client";

import { useId, useState } from "react";

/**
 * Click-to-toggle rather than a true long-press: long-press has no standard timing and
 * collides with the browser's own text-selection/context-menu gesture on mobile, so a
 * tap-to-toggle button is the more robust, WCAG-friendly equivalent — it also covers
 * desktop hover/focus for free via the same open state. Tooltip is `position: absolute`
 * (out of flow), so opening it never shifts surrounding layout (CLS).
 */
export function GlossaryTooltip({
  term,
  definition,
  children,
}: {
  term: string;
  definition: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-describedby={id}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      className="relative inline-block cursor-help border-b border-dotted border-[#d4af37]/50 outline-none focus-visible:border-[#d4af37]"
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-60 -translate-x-1/2 rounded-lg border border-[#d4af37]/30 bg-[#0b1220] px-3 py-2 text-left text-xs leading-relaxed text-parchment shadow-xl transition-opacity motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <strong className="text-[#d4af37]">{term}</strong> — {definition}
      </span>
    </span>
  );
}
