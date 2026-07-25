// Real open-source book source: Sefaria API (https://developers.sefaria.org)
// All book text (Hebrew + English) comes from this API — nothing fabricated.

const SEFARIA_BASE = "https://www.sefaria.org/api";

export type SefariaText = {
  ref: string;
  heRef: string;
  book: string;
  heTitle?: string;
  title?: string;
  /** A fully-specified single-verse ref (e.g. "Genesis 1:5") returns a plain string. */
  text: string | string[] | string[][];
  he: string | string[] | string[][];
  next: string | null;
  prev: string | null;
  sectionNames: string[];
  lengths?: number[];
  length?: number;
  categories: string[];
  primary_category: string;
  indexTitle: string;
  heIndexTitle: string;
  sectionRef: string;
  heSectionRef: string;
  firstAvailableSectionRef?: string;
  isSpanning?: boolean;
  versionTitle?: string;
};

export type IndexNode = {
  title?: string;
  heTitle?: string;
  enShortDesc?: string;
  heShortDesc?: string;
  categories?: string[];
  primary_category?: string;
  order?: number;
  contents?: IndexNode[];
  category?: string;
  heCategory?: string;
  enDesc?: string;
  heDesc?: string;
  corpus?: string;
};

async function sefariaFetch<T>(path: string, revalidate = 60 * 60 * 6): Promise<T> {
  const res = await fetch(`${SEFARIA_BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Sefaria API ${path} → ${res.status}`);
  }
  const data = await res.json();
  // Sefaria returns HTTP 200 with `{ error: "..." }` for unknown titles/refs instead of a
  // 404 status (e.g. GET /api/texts/NotARealBook_1 → 200 `{"error":"Could not find title in
  // reference: NotARealBook 1"}`). Without this check, every caller's `res.ok` guard passes
  // and bogus/misspelled book or chapter URLs render as blank-but-real-looking pages instead
  // of the 404 they're meant to fall through to.
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(`Sefaria API ${path} → ${(data as { error: string }).error}`);
  }
  return data as T;
}

export async function getIndex(): Promise<IndexNode[]> {
  return sefariaFetch<IndexNode[]>("/index", 60 * 60 * 24);
}

/** Text with chapter content in both Hebrew (`he`) and English (`text`). */
export async function getText(ref: string): Promise<SefariaText> {
  const encoded = encodeURIComponent(ref).replace(/%20/g, "_");
  return sefariaFetch<SefariaText>(`/texts/${encoded}?context=0&commentary=0`, 60 * 60 * 12);
}

/** A node in a "complex" work's schema tree (e.g. Zohar, Guide for the Perplexed). */
export type SchemaNode = {
  /** Canonical ref segment for this node, e.g. "Introduction". Real API responses use this, not `title`. */
  key?: string;
  /** Rarely present; kept only as a defensive fallback. */
  title?: string;
  titles?: { lang: string; text: string; primary?: boolean }[];
  nodes?: SchemaNode[];
};

export type BookIndex = {
  title: string;
  heTitle: string;
  categories: string[];
  sectionNames: string[];
  schema?: {
    lengths?: number[];
    sectionNames?: string[];
    heSectionNames?: string[];
    addressTypes?: string[];
    /** Present on "complex" works (e.g. Zohar, Guide for the Perplexed) instead of `lengths`. */
    nodes?: SchemaNode[];
  };
  lengths?: number[];
  authors?: { en: string; he: string }[];
  compDate?: (number | string)[];
  compPlace?: string;
  enDesc?: string;
  heDesc?: string;
  enShortDesc?: string;
  heShortDesc?: string;
  pubDate?: (number | string)[];
  pubPlace?: string;
};

export async function getBookIndex(title: string): Promise<BookIndex> {
  const encoded = encodeURIComponent(title).replace(/%20/g, "_");
  return sefariaFetch<BookIndex>(`/v2/raw/index/${encoded}`, 60 * 60 * 24);
}

/** Strip HTML tags & footnote markers from Sefaria text. */
export function cleanText(html: string): string {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&thinsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Flatten a text response to a single-dimension array of verses/lines. */
export function flatten(text: string[] | string[][]): string[] {
  const out: string[] = [];
  for (const item of text) {
    if (Array.isArray(item)) out.push(...item);
    else out.push(item);
  }
  return out.filter(Boolean);
}
