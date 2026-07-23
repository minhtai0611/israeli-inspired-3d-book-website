import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getIndex } from "@/lib/sefaria";
import { categorySlug, flattenBooks, groupByCategory } from "@/lib/library";

const BASE = SITE_URL;

// Fallback book list used only if the Sefaria index fetch fails at build/request time.
const CORE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "I Samuel", "II Samuel", "I Kings", "II Kings",
  "Isaiah", "Jeremiah", "Ezekiel",
  "Psalms", "Proverbs", "Job", "Song of Songs", "Ruth", "Lamentations",
  "Ecclesiastes", "Esther", "Daniel",
  "Pirkei Avot",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/thu-vien`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ve-chung-toi`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const nodes = await getIndex();
    const books = flattenBooks(nodes);
    const grouped = groupByCategory(books);

    const categoryRoutes: MetadataRoute.Sitemap = [...grouped.keys()].map((cat) => ({
      url: `${BASE}/thu-vien/${categorySlug(cat)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    const bookRoutes: MetadataRoute.Sitemap = books.map((b) => ({
      url: `${BASE}/sach/${encodeURIComponent(b.title)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...categoryRoutes, ...bookRoutes];
  } catch {
    const bookRoutes: MetadataRoute.Sitemap = CORE_BOOKS.map((b) => ({
      url: `${BASE}/sach/${encodeURIComponent(b)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...bookRoutes];
  }
}
