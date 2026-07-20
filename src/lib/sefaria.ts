// Real open-source book source: Sefaria API (https://developers.sefaria.org)
// All book text (Hebrew + English) comes from this API — nothing fabricated.

const SEFARIA_BASE = "https://www.sefaria.org/api";

export type SefariaText = {
  ref: string;
  heRef: string;
  book: string;
  heTitle?: string;
  title?: string;
  text: string[] | string[][];
  he: string[] | string[][];
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
  return res.json() as Promise<T>;
}

export async function getIndex(): Promise<IndexNode[]> {
  return sefariaFetch<IndexNode[]>("/index", 60 * 60 * 24);
}

/** Text with chapter content in both Hebrew (`he`) and English (`text`). */
export async function getText(ref: string): Promise<SefariaText> {
  const encoded = encodeURIComponent(ref).replace(/%20/g, "_");
  return sefariaFetch<SefariaText>(`/texts/${encoded}?context=0&commentary=0`, 60 * 60 * 12);
}

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
