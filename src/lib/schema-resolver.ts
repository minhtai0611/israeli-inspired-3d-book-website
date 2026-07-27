/**
 * Resolves a Sefaria book's real table-of-contents structure.
 *
 * Root cause this fixes: the reader previously assumed every book is a flat
 * integer-chapter array (`Array.from({ length: lengths[0] })`). Verified against
 * the live API (2026-07-25), Sefaria actually has three distinct addressing
 * schemes:
 *   - integer-like (`addressTypes[0]` is "Integer", "Perek", "Siman", etc. —
 *     anything that isn't "Talmud" and isn't a node tree): plain 1..N chapters.
 *   - "talmud": daf/amud paging, e.g. 2a, 2b, 3a — there is no daf 1.
 *   - "complex": `schema.nodes` is a tree of named sections (e.g. Zohar,
 *     Guide for the Perplexed) with NO per-node length in the raw index
 *     response — Sefaria auto-resolves a bare section ref (e.g.
 *     "Zohar, Introduction") to its first sub-section, so leaves are used
 *     as-is without enumerating their internal chapters.
 */
import type { BookIndex, SchemaNode } from "./sefaria";
import { toHebrewNumeral } from "./hebrew-numeral";

export type AddressKind = "integer" | "talmud" | "complex" | "unknown";

export type TocItem = {
  /** URL-safe path segment for /doc/{book}/{segment} */
  segment: string;
  /** Full Sefaria ref to fetch, e.g. "Genesis 5", "Berakhot 2a", "Zohar, Introduction" */
  ref: string;
  /** Display label, e.g. "5", "2a", "Introduction" */
  label: string;
  heLabel?: string;
};

export type ResolvedStructure = {
  kind: AddressKind;
  /** Unit name for the TOC heading, e.g. "Chapter", "Daf", "Phần" */
  unitName: string;
  items: TocItem[];
  firstRef: string | null;
  firstSegment: string | null;
};

/** Sefaria numbers Talmud daf from 2a — there is no daf 1. */
export function dafFromIndex(i: number): string {
  const daf = Math.floor(i / 2) + 2;
  return `${daf}${i % 2 === 0 ? "a" : "b"}`;
}

export function indexFromDaf(daf: string): number | null {
  const m = /^(\d+)([ab])$/i.exec(daf.trim());
  if (!m) return null;
  return (Number(m[1]) - 2) * 2 + (m[2].toLowerCase() === "a" ? 0 : 1);
}

/** Hebrew daf label, e.g. "2a" -> "ב׳ ע״א". */
export function hebrewDafLabel(daf: string): string {
  const m = /^(\d+)([ab])$/i.exec(daf);
  if (!m) return daf;
  const amud = m[2].toLowerCase() === "a" ? 'ע"א' : 'ע"ב';
  return `${toHebrewNumeral(Number(m[1]))}׳ ${amud}`;
}

/**
 * Joins a book title with a chapter/segment into the ref Sefaria expects.
 * Numeric/daf segments join with a space — including multi-level addresses
 * like "1:2" (chapter:verse) or "2a:3" (daf:line), which some deeper
 * JaggedArray refs resolve to ("Genesis 5", "Berakhot 2a", "... 1:2").
 * Anything else is a named complex-schema section, which Sefaria addresses
 * with a comma ("Zohar, Introduction"). Verified against the live API.
 */
export function buildRef(title: string, segment: string): string {
  return /^\d+[ab]?(:\d+[ab]?)*$/i.test(segment) ? `${title} ${segment}` : `${title}, ${segment}`;
}

function classifyAddressKind(index: BookIndex): AddressKind {
  const schema = index.schema;
  if (schema?.nodes && schema.nodes.length > 0) return "complex";
  if (schema?.addressTypes?.[0] === "Talmud") return "talmud";
  const len = index.lengths?.[0] ?? schema?.lengths?.[0] ?? 0;
  return len > 0 ? "integer" : "unknown";
}

function nodeTitle(node: SchemaNode, lang: "en" | "he"): string | undefined {
  if (lang === "en" && node.title) return node.title;
  const match = node.titles?.find((t) => t.lang === lang && t.primary) ?? node.titles?.find((t) => t.lang === lang);
  if (match) return match.text;
  if (lang === "en") return node.sharedTitle ?? node.key;
  return undefined;
}

/**
 * A Sefaria "default child" (`default: true`) has no name of its own — its
 * content is what a bare ref to its PARENT auto-resolves into (the same
 * mechanism ADR 0001 already relies on for named complex nodes, e.g. "Zohar,
 * Introduction"). Using its internal `key` (typically the literal string
 * "default") as if it were a real section name produces a ref Sefaria
 * doesn't recognize — this was a real, reproducible 404 hit across 50+ books
 * in a 400-book sample (Sha'arei Kedusha, Marpeh la'Nefesh, Abarbanel on
 * Torah, etc.), found via scripts/audit-complex-nav.ts.
 */
function collectLeaves(nodes: SchemaNode[], pathSegments: string[], out: { segment: string; label: string; heLabel?: string }[]): void {
  for (const n of nodes) {
    if (n.default) {
      // Reuse the parent's own path as the leaf: Sefaria auto-resolves it
      // into this node's first section. If the parent path is empty (this
      // default child sits directly at the book's own root, e.g. Ramban on
      // Exodus's main commentary body), there's no bare-title auto-resolve
      // entry point we can link to without guessing an unverified chapter
      // number — skip it rather than emit a link that will 404.
      if (pathSegments.length > 0) {
        out.push({ segment: pathSegments.join(", "), label: pathSegments[pathSegments.length - 1] });
      }
      continue;
    }
    const label = nodeTitle(n, "en") ?? "";
    const heLabel = nodeTitle(n, "he");
    const path = label ? [...pathSegments, label] : pathSegments;
    if (n.nodes?.length) {
      collectLeaves(n.nodes, path, out);
    } else if (path.length > 0) {
      out.push({ segment: path.join(", "), label, heLabel });
    }
  }
}

export function buildIntegerItems(title: string, len: number, sectionName: string): ResolvedStructure {
  const items: TocItem[] = Array.from({ length: len }, (_, i) => {
    const n = String(i + 1);
    return { segment: n, ref: buildRef(title, n), label: n, heLabel: toHebrewNumeral(i + 1) };
  });
  return {
    kind: "integer",
    unitName: sectionName,
    items,
    firstRef: items[0]?.ref ?? null,
    firstSegment: items[0]?.segment ?? null,
  };
}

export function resolveStructure(index: BookIndex, title: string): ResolvedStructure {
  const kind = classifyAddressKind(index);
  const schema = index.schema;

  if (kind === "talmud") {
    const len = index.lengths?.[0] ?? schema?.lengths?.[0] ?? 0;
    const items: TocItem[] = Array.from({ length: len }, (_, i) => {
      const daf = dafFromIndex(i);
      return { segment: daf, ref: buildRef(title, daf), label: daf, heLabel: hebrewDafLabel(daf) };
    });
    return {
      kind, unitName: "Daf", items,
      firstRef: items[0]?.ref ?? null, firstSegment: items[0]?.segment ?? null,
    };
  }

  if (kind === "complex" && schema?.nodes) {
    const leaves: { segment: string; label: string; heLabel?: string }[] = [];
    collectLeaves(schema.nodes, [], leaves);
    const items: TocItem[] = leaves.map((l) => ({ ...l, ref: buildRef(title, l.segment) }));
    return {
      kind, unitName: "Phần", items,
      firstRef: items[0]?.ref ?? null, firstSegment: items[0]?.segment ?? null,
    };
  }

  if (kind === "integer") {
    const len = index.lengths?.[0] ?? schema?.lengths?.[0] ?? 0;
    return buildIntegerItems(title, len, index.sectionNames?.[0] ?? schema?.sectionNames?.[0] ?? "Chương");
  }

  return { kind: "unknown", unitName: "Phần", items: [], firstRef: null, firstSegment: null };
}

/** True if `segment` is one of the structure's declared valid entries — used to reject made-up URLs. */
export function isValidSegment(structure: ResolvedStructure, segment: string): boolean {
  return structure.items.some((it) => it.segment === segment);
}

/**
 * True if `echoed` (what Sefaria's API actually resolved the request to) is
 * either exactly `requested`, or a deeper refinement of it (e.g. requesting
 * the bare complex-schema node "Zohar, Introduction" legitimately echoes back
 * "Zohar, Introduction 1" — Sefaria auto-resolving to the first section).
 *
 * False means Sefaria silently CLAMPED an out-of-range/invalid ref to some
 * unrelated valid one instead of erroring — the exact mechanism behind the
 * /doc/Berakhot/999 crawler-trap bug (999 clamps to "Berakhot 2a", a
 * completely different ref, not a refinement of "Berakhot 999").
 *
 * Guards against the naive `startsWith` false-positive where "Genesis 5" is a
 * literal string-prefix of "Genesis 50" by requiring the next character (if
 * any) to be a separator, not a continuing digit.
 */
export function isRefRefinement(requested: string, echoed: string): boolean {
  const r = requested.trim();
  const e = echoed.trim();
  if (r === e) return true;
  if (!e.startsWith(r)) return false;
  const nextChar = e[r.length];
  return nextChar === " " || nextChar === "," || nextChar === ":";
}

/** Minimal shape of a Sefaria text response needed to find the first non-empty section. */
export type TextLookupResult = {
  ref: string;
  indexTitle: string;
  /** A fully-specified single-verse ref returns a plain string instead of an array. */
  text: string | string[] | string[][];
  he: string | string[] | string[][];
  next: string | null;
};

/**
 * A fully-specified ref (e.g. "... 1:2", a single verse) makes Sefaria return
 * `text`/`he` as a plain string rather than an array — unlike chapter-level
 * refs, which return string[] or string[][]. Handles any of those shapes.
 */
function nonEmpty(v: unknown): boolean {
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.some(nonEmpty);
  return false;
}

function hasContent(data: Pick<TextLookupResult, "text" | "he">): boolean {
  return nonEmpty(data.text) || nonEmpty(data.he);
}

/**
 * Strips a book's index title off the front of one of its refs, leaving just
 * the chapter/section segment — e.g. ("Genesis 5", "Genesis") -> "5",
 * ("Guide for the Perplexed, Introduction of Ibn Tibon", "Guide for the
 * Perplexed") -> "Introduction of Ibn Tibon". Falls back to returning `ref`
 * unchanged if it doesn't actually start with `indexTitle` (unexpected
 * shape) — callers should treat that as "couldn't parse" rather than trust
 * the result as a segment.
 */
export function segmentFromRef(ref: string, indexTitle: string): string {
  const commaPrefix = `${indexTitle}, `;
  const spacePrefix = `${indexTitle} `;
  if (ref.startsWith(commaPrefix)) return ref.slice(commaPrefix.length);
  if (ref.startsWith(spacePrefix)) return ref.slice(spacePrefix.length);
  return ref;
}

/**
 * Some Sefaria works (mostly sparse commentaries) declare a real first
 * section that has no text at all — e.g. "Ben Yehoyada on Shevuot 2a" is a
 * valid, correctly-addressed ref, but Sefaria's own data has nothing there
 * until "6b". Sefaria exposes exactly where content resumes via `next`, so
 * "Đọc từ đầu" follows it instead of landing on a blank page. Capped at 20
 * hops as a safety net against pathological chains.
 */
export async function findFirstReadableRef(
  structure: ResolvedStructure,
  fetchText: (ref: string) => Promise<TextLookupResult>,
): Promise<{ ref: string; segment: string } | null> {
  if (!structure.firstRef) return null;
  let ref: string | null = structure.firstRef;
  for (let hop = 0; hop < 20 && ref; hop++) {
    let data: TextLookupResult;
    try {
      data = await fetchText(ref);
    } catch {
      return null;
    }
    if (hasContent(data)) {
      return { ref: data.ref, segment: segmentFromRef(data.ref, data.indexTitle) };
    }
    ref = data.next;
  }
  return null;
}
