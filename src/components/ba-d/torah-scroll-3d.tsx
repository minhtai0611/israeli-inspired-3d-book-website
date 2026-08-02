"use client";

import { useRef, useState } from "react";

// Interactive CSS-3D Torah scroll (Etz Chaim rollers + unrolled parchment).
// Pure CSS `transform-style: preserve-3d` — no WebGL/Three.js, so this file's
// entire cost only lands on the client bundle once a user opts in via the
// dynamic import in HeroOrbit, keeping the default page at 0 added bytes.
export function TorahScroll3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -18, y: px * 22 });
  }

  function handlePointerLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label="Mô hình cuộn sách Torah 3D tương tác — xoay theo con trỏ chuột"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto aspect-square w-full max-w-[520px] [perspective:1400px]"
    >
      <div
        className="relative h-full w-full transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* glow behind the scroll */}
        <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(212,175,55,.5),transparent_65%)] blur-2xl" />

        {/* scroll assembly, centered and given depth */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-3"
          style={{ transform: "translateZ(40px)" }}
        >
          {/* left roller (Etz Chaim) */}
          <div
            className="h-4/5 w-9 rounded-full bg-gradient-to-b from-[#8b1e2d] via-[#a37d1a] to-[#8b1e2d] shadow-[inset_-4px_0_10px_rgba(0,0,0,.5),inset_4px_0_10px_rgba(247,227,154,.25)]"
            style={{ transform: "translateZ(6px)" }}
          />

          {/* unrolled parchment */}
          <div
            className="parchment relative h-4/5 w-[58%] overflow-hidden rounded-sm px-4 py-6"
            style={{ transform: "translateZ(0px)" }}
          >
            <p
              dir="rtl"
              lang="he"
              className="font-hebrew text-center text-lg leading-loose text-[#3a2c12]/90"
            >
              בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ
            </p>
            <div className="mt-4 h-px w-full bg-[#a37d1a]/30" />
            <p className="mt-4 text-center font-serif text-xs italic text-[#3a2c12]/70">
              Sáng Thế Ký 1:1 — “Ban đầu, Elohim tạo dựng trời và đất.”
            </p>
          </div>

          {/* right roller (Etz Chaim) */}
          <div
            className="h-4/5 w-9 rounded-full bg-gradient-to-b from-[#8b1e2d] via-[#a37d1a] to-[#8b1e2d] shadow-[inset_-4px_0_10px_rgba(247,227,154,.25),inset_4px_0_10px_rgba(0,0,0,.5)]"
            style={{ transform: "translateZ(6px)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default TorahScroll3D;
