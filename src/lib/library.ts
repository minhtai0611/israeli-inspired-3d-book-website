// Shared helpers for turning a Sefaria index tree into a flat, browsable/searchable
// book list. Used by /thu-vien, /thu-vien/[category], /tim-kiem, and sitemap.ts so
// they all agree on the same book set instead of re-deriving it separately.
import type { IndexNode } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";

export type FlatBook = {
  title: string;
  heTitle: string;
  categoryPath: string[];
  shortDesc?: string;
};

export function flattenBooks(nodes: IndexNode[], path: string[] = []): FlatBook[] {
  const out: FlatBook[] = [];
  for (const n of nodes) {
    if (n.title) {
      out.push({
        title: n.title,
        heTitle: n.heTitle ?? n.title,
        categoryPath: n.categories ?? path,
        shortDesc: n.enShortDesc,
      });
    } else if (n.contents) {
      const p = n.category ? [...path, n.category] : path;
      out.push(...flattenBooks(n.contents, p));
    }
  }
  return out;
}

export const CATEGORY_ORDER = [
  "Tanakh",
  "Mishnah",
  "Talmud",
  "Midrash",
  "Halakhah",
  "Kabbalah",
  "Liturgy",
  "Jewish Thought",
  "Tosefta",
  "Chasidut",
  "Musar",
  "Responsa",
  "Second Temple",
  "Reference",
];

export function sortCategories<T extends [string, unknown]>(entries: T[]): T[] {
  return [...entries].sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function groupByCategory(books: FlatBook[]): Map<string, FlatBook[]> {
  const grouped = new Map<string, FlatBook[]>();
  for (const b of books) {
    const key = b.categoryPath[0] ?? "Khác";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }
  return grouped;
}

export function categorySlug(category: string): string {
  return category.replace(/\s+/g, "-");
}

export function categoryFromSlug(slug: string, categories: string[]): string | undefined {
  return categories.find((c) => categorySlug(c) === slug);
}

/** Simple case/diacritics-insensitive substring search across EN/HE/VI names. */
export function searchBooks(books: FlatBook[], query: string, limit = 40): FlatBook[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { book: FlatBook; score: number }[] = [];
  for (const b of books) {
    const vi = viBook(b.title);
    const cat = viCategory(b.categoryPath[0] ?? "");
    const haystacks = [
      { text: b.title, weight: 3 },
      { text: b.heTitle, weight: 2 },
      { text: vi?.name, weight: 3 },
      { text: vi?.blurb, weight: 1 },
      { text: b.shortDesc, weight: 1 },
      { text: cat.name, weight: 1 },
      { text: b.categoryPath.join(" "), weight: 1 },
    ];
    let score = 0;
    for (const { text, weight } of haystacks) {
      if (!text) continue;
      const norm = normalize(text);
      if (norm === q) score += weight * 10;
      else if (norm.startsWith(q)) score += weight * 5;
      else if (norm.includes(q)) score += weight;
    }
    if (score > 0) scored.push({ book: b, score });
  }
  scored.sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title));
  return scored.slice(0, limit).map((s) => s.book);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
