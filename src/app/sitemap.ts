import { cache } from "react";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getIndex } from "@/lib/sefaria";
import { categorySlug, flattenBooks, groupByCategory } from "@/lib/library";
import { POPULAR_BOOKS } from "@/lib/popular-books";

const BASE = SITE_URL;
// Google's own limit is 50,000 URLs/sitemap; kept well under that so each
// chunk stays small and fast to regenerate independently.
const PER_SITEMAP = 5000;

// Fallback book list used only if the Sefaria index fetch fails at build/request time.
const CORE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "I Samuel", "II Samuel", "I Kings", "II Kings",
  "Isaiah", "Jeremiah", "Ezekiel",
  "Psalms", "Proverbs", "Job", "Song of Songs", "Ruth", "Lamentations",
  "Ecclesiastes", "Esther", "Daniel",
  "Pirkei Avot",
];

// Memoized with React's `cache()` so generateSitemaps() and every
// sitemap({id}) call share ONE getIndex() fetch instead of three — that
// fetch is ~4-5MB (over Next's Data Cache 2MB limit, so it's never actually
// cached), and paying it 3x during the build compounded with the ~394
// concurrent popular-chapter prerenders was enough to push some of THOSE
// requests over their own timeout and fail the whole production build.
const buildAllRoutes = cache(async (): Promise<MetadataRoute.Sitemap> => {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // /read coverage: the popular set is the only part of the catalog verified
  // to reliably resolve to real content on the primary path (see the
  // schema-resolver fix and audit-coverage.ts) — everything else risks
  // indexing a chapter that 404s or is genuinely empty in Sefaria's data.
  const docRoutes: MetadataRoute.Sitemap = POPULAR_BOOKS.flatMap(([title, chapterCount]) =>
    Array.from({ length: chapterCount }, (_, i) => ({
      url: `${BASE}/read/${encodeURIComponent(title)}/${i + 1}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  );

  try {
    const nodes = await getIndex();
    const books = flattenBooks(nodes);
    const grouped = groupByCategory(books);

    const categoryRoutes: MetadataRoute.Sitemap = [...grouped.keys()].map((cat) => ({
      url: `${BASE}/library/${categorySlug(cat)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    const bookRoutes: MetadataRoute.Sitemap = books.map((b) => ({
      url: `${BASE}/book/${encodeURIComponent(b.title)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...docRoutes, ...categoryRoutes, ...bookRoutes];
  } catch {
    const bookRoutes: MetadataRoute.Sitemap = CORE_BOOKS.map((b) => ({
      url: `${BASE}/book/${encodeURIComponent(b)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...docRoutes, ...bookRoutes];
  }
});

export async function generateSitemaps() {
  const all = await buildAllRoutes();
  const count = Math.max(1, Math.ceil(all.length / PER_SITEMAP));
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id);
  const all = await buildAllRoutes();
  return all.slice(index * PER_SITEMAP, (index + 1) * PER_SITEMAP);
}
