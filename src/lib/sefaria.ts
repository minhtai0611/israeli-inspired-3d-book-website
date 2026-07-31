// Real open-source book source: Sefaria API (https://developers.sefaria.org)
// All book text (Hebrew + English) comes from this API — nothing fabricated.
import { eq } from "drizzle-orm";

const SEFARIA_BASE = "https://www.sefaria.org/api";
const CHAPTER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

/** The ref/title genuinely doesn't exist in Sefaria — a real 404. */
export class SefariaNotFoundError extends Error {}
/** Sefaria itself is unreachable or erroring — NOT the same as not-found; callers must not
 * treat this as "page doesn't exist" (that would get real content deindexed by search engines
 * whenever the upstream API has a bad moment). */
export class SefariaUpstreamError extends Error {}

/**
 * Retries only network/timeout failures (not HTTP error statuses — those are
 * informative, not transient). Needed because building the site's popular
 * chapters/books (generateStaticParams) fires hundreds of concurrent
 * requests at Sefaria; without this, a single slow response under that load
 * fails the entire production build, even though a plain retry succeeds.
 */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * 2 ** i));
    }
  }
  throw lastError;
}

async function sefariaFetch<T>(path: string, revalidate = 60 * 60 * 6): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithRetry(`${SEFARIA_BASE}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    throw new SefariaUpstreamError(`Network error fetching Sefaria ${path}: ${String(e)}`);
  }
  if (res.status === 404) {
    throw new SefariaNotFoundError(`Sefaria API ${path} → 404`);
  }
  if (!res.ok) {
    throw new SefariaUpstreamError(`Sefaria API ${path} → ${res.status}`);
  }
  const data = await res.json();
  // Sefaria returns HTTP 200 with `{ error: "..." }` for unknown titles/refs instead of a
  // 404 status (e.g. GET /api/texts/NotARealBook_1 → 200 `{"error":"Could not find title in
  // reference: NotARealBook 1"}`). Without this check, every caller's `res.ok` guard passes
  // and bogus/misspelled book or chapter URLs render as blank-but-real-looking pages instead
  // of the 404 they're meant to fall through to.
  if (data && typeof data === "object" && "error" in data) {
    throw new SefariaNotFoundError(`Sefaria API ${path} → ${(data as { error: string }).error}`);
  }
  return data as T;
}

export async function getIndex(): Promise<IndexNode[]> {
  return sefariaFetch<IndexNode[]>("/index", 60 * 60 * 24);
}

/**
 * Text with chapter content in both Hebrew (`he`) and English (`text`).
 * Stale-while-revalidate: serves chapter_text_cache when fresher than
 * CHAPTER_CACHE_TTL_MS, otherwise fetches live and mirrors the result back.
 * Cache reads/writes are best-effort — a DB hiccup falls through to (or past)
 * the live Sefaria fetch rather than failing the request.
 */
export async function getText(ref: string): Promise<SefariaText> {
  try {
    const { db } = await import("@/db");
    const { chapterTextCache } = await import("@/db/schema");
    const [cached] = await db
      .select({ content: chapterTextCache.content, fetchedAt: chapterTextCache.fetchedAt })
      .from(chapterTextCache)
      .where(eq(chapterTextCache.ref, ref))
      .limit(1);
    if (cached && Date.now() - cached.fetchedAt.getTime() < CHAPTER_CACHE_TTL_MS) {
      return cached.content as SefariaText;
    }
  } catch {
    // Cache unreachable (DB down, or no DATABASE_URL in this environment) — fall through.
  }

  const encoded = encodeURIComponent(ref).replace(/%20/g, "_");
  const data = await sefariaFetch<SefariaText>(`/texts/${encoded}?context=0&commentary=0`, 60 * 60 * 12);

  try {
    const { db } = await import("@/db");
    const { chapterTextCache } = await import("@/db/schema");
    await db
      .insert(chapterTextCache)
      .values({ ref, content: data })
      .onConflictDoUpdate({ target: chapterTextCache.ref, set: { content: data, fetchedAt: new Date() } });
  } catch {
    // Best-effort mirror — the live Sefaria response above is already correct either way.
  }

  return data;
}

/** A node in a "complex" work's schema tree (e.g. Zohar, Guide for the Perplexed). */
export type SchemaNode = {
  /** Canonical ref segment for this node, e.g. "Introduction". Real API responses use this, not `title`. */
  key?: string;
  /** Rarely present; kept only as a defensive fallback. */
  title?: string;
  titles?: { lang: string; text: string; primary?: boolean }[];
  /**
   * Some nodes (e.g. Ramban on Exodus's main commentary body) have no
   * `titles` at all, just this single display string instead — verified
   * live 2026-07-27.
   */
  sharedTitle?: string;
  /**
   * Marks a Sefaria "default child" — not independently addressable; a bare
   * ref to its PARENT auto-resolves into it. Its own `key` (typically the
   * literal string "default") is an internal identifier, not a ref segment.
   */
  default?: boolean;
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

export type VerseSearchHit = {
  ref: string;
  heRef: string;
  /** Language of the specific indexed version this hit matched in — a verse can match once per translation. */
  lang: string;
  /** Sefaria's own <b>-highlighted snippet — not rendered raw; callers re-highlight against safely-escaped text. */
  snippet: string;
  categories: string[];
};

export type VerseSearchResult = {
  total: number;
  hits: VerseSearchHit[];
};

const VERSE_SEARCH_PAGE_SIZE = 10;

/**
 * Full-text search over Sefaria's text corpus via its ElasticSearch proxy
 * (POST /api/search-wrapper — request/response shape verified live against
 * the real API 2026-07-31, not from docs alone). Distinct from getIndex()'s
 * title/metadata search in src/lib/library.ts.
 */
export async function searchVerses(query: string, page = 1): Promise<VerseSearchResult> {
  let res: Response;
  try {
    res = await fetchWithRetry(`${SEFARIA_BASE}/search-wrapper`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query,
        type: "text",
        field: "naive_lemmatizer",
        size: VERSE_SEARCH_PAGE_SIZE,
        from: (page - 1) * VERSE_SEARCH_PAGE_SIZE,
        slop: 10,
        sort_method: "score",
        sort_fields: ["pagesheetrank"],
        filter_fields: [],
        filters: [],
        aggs: ["path"],
        source_proj: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    throw new SefariaUpstreamError(`Network error calling Sefaria search-wrapper: ${String(e)}`);
  }
  if (!res.ok) {
    throw new SefariaUpstreamError(`Sefaria search-wrapper → ${res.status}`);
  }
  const data = await res.json();
  type RawHit = {
    _source: { ref: string; heRef: string; lang: string; exact?: string; categories?: string[] };
    highlight?: { naive_lemmatizer?: string[] };
  };
  const rawHits: RawHit[] = data?.hits?.hits ?? [];
  return {
    total: data?.hits?.total ?? 0,
    hits: rawHits.map((h) => ({
      ref: h._source.ref,
      heRef: h._source.heRef,
      lang: h._source.lang,
      snippet: h.highlight?.naive_lemmatizer?.[0] ?? h._source.exact ?? "",
      categories: h._source.categories ?? [],
    })),
  };
}

export type VerseLink = {
  category: string;
  ref: string;
  collectiveTitle: { en: string; he?: string };
  /** English text of the linked commentary/Targum — absent when sourceHasEn is false. */
  text?: string;
  /** Hebrew text of the linked commentary/Targum. */
  he?: string;
};

type VerseLinkMeta = {
  category: string;
  ref: string;
  collectiveTitle?: { en: string; he?: string };
  /** Sefaria's own canonical ordering for a verse's commentaries (e.g. Rashi before later commentators). */
  commentaryNum?: number;
};

/**
 * Caps how many commentary/Targum links get their full text resolved per verse.
 * `with_text=1` on a heavily-annotated verse (e.g. Genesis 1:1 has 529 Commentary
 * links alone) returns a multi-MB payload and can take 10s+ — verified live
 * 2026-07-31. Fetching metadata only (with_text=0, ~2s even for Genesis 1:1) and
 * resolving just the top N via getText() (already SWR-cached) keeps this bounded.
 */
const MAX_VERSE_LINKS = 20;

/**
 * Commentary/Targum links for a ref. Shape verified live against the real API
 * 2026-07-31: GET /api/links/{ref}?with_text=0&category=Commentary&category=Targum
 * returns link metadata (category distinguishes "Commentary"/"Targum" from the
 * ~15 other link categories Sefaria returns) without the large embedded text
 * blobs that with_text=1 carries.
 */
export async function getVerseLinks(ref: string): Promise<VerseLink[]> {
  const encoded = encodeURIComponent(ref).replace(/%20/g, "_");
  const meta = await sefariaFetch<VerseLinkMeta[]>(
    `/links/${encoded}?with_text=0&category=Commentary&category=Targum`,
    60 * 60 * 12,
  );
  const top = meta
    .filter((l) => l.category === "Commentary" || l.category === "Targum")
    .sort((a, b) => (a.commentaryNum ?? 0) - (b.commentaryNum ?? 0))
    .slice(0, MAX_VERSE_LINKS);

  const asPlainText = (v: string | string[] | string[][]): string =>
    typeof v === "string" ? v : Array.isArray(v) ? v.flat(2).join(" ") : "";

  async function resolveOne(l: VerseLinkMeta): Promise<VerseLink | null> {
    try {
      const data = await getText(l.ref);
      return {
        category: l.category,
        ref: l.ref,
        collectiveTitle: l.collectiveTitle ?? { en: l.ref },
        text: cleanText(asPlainText(data.text)) || undefined,
        he: cleanText(asPlainText(data.he)) || undefined,
      };
    } catch {
      return null; // A single bad/missing commentary ref shouldn't drop the whole drawer.
    }
  }

  // Resolving all MAX_VERSE_LINKS refs in one Promise.all fan-out timed out in
  // production (~9.3s, verified against the live deployment 2026-07-31) even for
  // lightly-annotated verses where a single getText() call is fast — some
  // concurrency limit (Sefaria per-IP throttling, Neon's pooled-connection cap, or
  // Vercel's outbound limits) that didn't reproduce locally. Batching mirrors the
  // same CONCURRENCY=5 pattern sync-catalog.ts already uses for bulk Sefaria fetches.
  const RESOLVE_CONCURRENCY = 5;
  const resolved: (VerseLink | null)[] = [];
  for (let i = 0; i < top.length; i += RESOLVE_CONCURRENCY) {
    const chunk = top.slice(i, i + RESOLVE_CONCURRENCY);
    resolved.push(...(await Promise.all(chunk.map(resolveOne))));
  }
  return resolved.filter((l): l is VerseLink => l !== null);
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
