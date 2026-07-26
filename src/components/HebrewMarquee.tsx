const LETTERS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
];

export function HebrewMarquee() {
  const row = [...LETTERS, ...LETTERS];
  return (
    <div aria-hidden="true" className="pointer-events-none relative overflow-hidden py-6">
      <div className="marquee flex gap-10 whitespace-nowrap font-hebrew text-3xl text-[#d4af37]/40">
        {row.map((l, i) => (
          <span key={i} className="inline-flex items-center gap-10">
            <span className="drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]">{l}</span>
            <span className="text-[#d4af37]/25">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
