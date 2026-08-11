// Pure-CSS 3D orbital scene with rotating Star-of-David hexagram and orbiting
// glyphs — evokes ancient Jerusalem architecture meeting a synth-future.

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Desktop-only, opt-in interactive 3D Torah scroll. next/dynamic + ssr:false
// requires a Client Component (Next.js app-router rule) and is only pulled
// into the client bundle once a user toggles it — the default orbit above
// stays 0 added bytes for the 95% of visitors who never click the button.
const TorahScroll3D = dynamic(() => import("./3d/torah-scroll-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full max-w-[520px] items-center justify-center text-sm text-parchment/60">
      Đang tải mô hình 3D…
    </div>
  ),
});

export function HeroOrbit() {
  const [show3d, setShow3d] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <button
        type="button"
        onClick={() => setShow3d((v) => !v)}
        className="motion-reduce:hidden hidden md:mb-4 md:inline-flex md:items-center md:gap-2 md:rounded-full md:border md:border-[#d4af37]/40 md:bg-[#d4af37]/5 md:px-4 md:py-1.5 md:text-xs md:uppercase md:tracking-[0.2em] md:text-[#d4af37] md:transition md:hover:bg-[#d4af37]/10"
        aria-pressed={show3d}
      >
        {show3d ? "Tắt chế độ 3D Cuộn sách Torah" : "Bật chế độ 3D Cuộn sách Torah (Desktop)"}
      </button>

      {show3d ? <TorahScroll3D /> : <HeroOrbitCss />}
    </div>
  );
}

function HeroOrbitCss() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* glow */}
      <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,.55),transparent_60%)] blur-2xl" />

      {/* rings */}
      <div className="absolute inset-0 rounded-full border border-[#d4af37]/25" />
      <div className="absolute inset-8 rounded-full border border-[#d4af37]/15" />
      <div className="absolute inset-16 rounded-full border border-[#d4af37]/10" />

      {/* spinning star */}
      <div className="absolute inset-0 flex items-center justify-center [perspective:1000px]">
        <svg
          viewBox="0 0 200 200"
          className="spin-3d h-2/3 w-2/3"
          style={{ transformStyle: "preserve-3d" }}
        >
          <defs>
            <linearGradient id="starG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7e39a" />
              <stop offset=".5" stopColor="#d4af37" />
              <stop offset="1" stopColor="#8b1e2d" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Upward triangle */}
          <polygon
            points="100,15 180,155 20,155"
            fill="none"
            stroke="url(#starG)"
            strokeWidth="2"
            filter="url(#glow)"
          />
          {/* Downward triangle */}
          <polygon
            points="100,185 20,45 180,45"
            fill="none"
            stroke="url(#starG)"
            strokeWidth="2"
            filter="url(#glow)"
          />
          {/* inner mosaic */}
          <circle cx="100" cy="100" r="30" fill="none" stroke="#d4af37" strokeOpacity=".45" />
          <text
            x="100"
            y="112"
            textAnchor="middle"
            fill="#f4ead2"
            fontSize="28"
            fontFamily="var(--font-frank)"
            letterSpacing="4"
          >
            אור
          </text>
        </svg>
      </div>

      {/* orbiting hebrew letters */}
      {["א", "ב", "ג", "ד", "ה", "ו"].map((l, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 44; // percent
        const x = 50 + Math.cos(angle) * r;
        const y = 50 + Math.sin(angle) * r;
        return (
          <span
            key={l}
            className="floater absolute font-hebrew text-4xl"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${i * 1.3}s`,
            }}
          >
            {l}
          </span>
        );
      })}

      {/* corner ornaments */}
      <div className="absolute -left-2 -top-2 h-10 w-10 border-l border-t border-[#d4af37]/60" />
      <div className="absolute -right-2 -top-2 h-10 w-10 border-r border-t border-[#d4af37]/60" />
      <div className="absolute -bottom-2 -left-2 h-10 w-10 border-b border-l border-[#d4af37]/60" />
      <div className="absolute -bottom-2 -right-2 h-10 w-10 border-b border-r border-[#d4af37]/60" />
    </div>
  );
}
