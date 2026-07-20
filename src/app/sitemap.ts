import type { MetadataRoute } from "next";

const BASE = "https://sifria.app";

const CORE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "I Samuel", "II Samuel", "I Kings", "II Kings",
  "Isaiah", "Jeremiah", "Ezekiel",
  "Psalms", "Proverbs", "Job", "Song of Songs", "Ruth", "Lamentations",
  "Ecclesiastes", "Esther", "Daniel",
  "Pirkei Avot",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/thu-vien`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/ve-chung-toi`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  const bookRoutes: MetadataRoute.Sitemap = CORE_BOOKS.map((b) => ({
    url: `${BASE}/sach/${encodeURIComponent(b)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticRoutes, ...bookRoutes];
}
