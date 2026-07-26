/**
 * The Torah, Psalms, the five Megillot, and Pirkei Avot — the highest-traffic
 * titles, prerendered at build time so /sach and /doc serve them from the CDN
 * instead of rendering on every request. Chapter counts verified against the
 * live Sefaria API (2026-07-26), not assumed.
 */
export const POPULAR_BOOKS: readonly [string, number][] = [
  ["Genesis", 50],
  ["Exodus", 40],
  ["Leviticus", 27],
  ["Numbers", 36],
  ["Deuteronomy", 34],
  ["Psalms", 150],
  ["Song of Songs", 8],
  ["Ruth", 4],
  ["Lamentations", 5],
  ["Ecclesiastes", 12],
  ["Esther", 10],
  ["Pirkei Avot", 6],
];
