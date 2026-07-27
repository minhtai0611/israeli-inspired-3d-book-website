import { describe, it, expect } from "vitest";
import {
  dafFromIndex,
  indexFromDaf,
  hebrewDafLabel,
  buildRef,
  resolveStructure,
  isValidSegment,
  isRefRefinement,
  findFirstReadableRef,
  segmentFromRef,
  type TextLookupResult,
} from "@/lib/schema-resolver";
import type { BookIndex } from "@/lib/sefaria";

describe("daf indexing", () => {
  it("starts at 2a, no daf 1", () => {
    expect(dafFromIndex(0)).toBe("2a");
    expect(dafFromIndex(1)).toBe("2b");
    expect(dafFromIndex(2)).toBe("3a");
  });
  it("round-trips daf <-> index", () => {
    for (let i = 0; i < 300; i++) expect(indexFromDaf(dafFromIndex(i))).toBe(i);
  });
  it("rejects malformed daf strings", () => {
    expect(indexFromDaf("1")).toBeNull();
    expect(indexFromDaf("2c")).toBeNull();
  });
});

describe("hebrewDafLabel", () => {
  it("2a -> Hebrew numeral + amud alef", () => {
    expect(hebrewDafLabel("2a")).toBe('ב׳ ע"א');
  });
  it("15b uses טו, not יה", () => {
    expect(hebrewDafLabel("15b")).toBe('טו׳ ע"ב');
  });
});

describe("buildRef", () => {
  it("joins integer/daf segments with a space", () => {
    expect(buildRef("Genesis", "5")).toBe("Genesis 5");
    expect(buildRef("Berakhot", "2a")).toBe("Berakhot 2a");
  });
  it("joins multi-level integer refs (chapter:verse, daf:line) with a space, not a comma", () => {
    // Regression: deeper JaggedArray leaves resolve to colon-separated refs
    // (e.g. commentaries on Mishneh Torah); these were wrongly comma-joined,
    // producing a ref Sefaria returns empty content for.
    expect(buildRef("Lechem Mishneh on Mishneh Torah, Offerings", "1:2")).toBe(
      "Lechem Mishneh on Mishneh Torah, Offerings 1:2",
    );
    expect(buildRef("Berakhot", "2a:3")).toBe("Berakhot 2a:3");
  });
  it("joins named complex segments with a comma", () => {
    expect(buildRef("Zohar", "Introduction")).toBe("Zohar, Introduction");
    expect(buildRef("Zohar", "Addenda, Volume I")).toBe("Zohar, Addenda, Volume I");
  });
});

// Fixtures mirror the real /api/v2/raw/index response shapes, verified live 2026-07-25.
const GENESIS: BookIndex = {
  title: "Genesis",
  heTitle: "בראשית",
  categories: ["Tanakh", "Torah"],
  sectionNames: [],
  lengths: undefined,
  schema: { addressTypes: ["Perek", "Pasuk"], sectionNames: ["Chapter", "Verse"], lengths: [50, 1533] },
} as unknown as BookIndex;

const BERAKHOT: BookIndex = {
  title: "Berakhot",
  heTitle: "ברכות",
  categories: ["Talmud", "Bavli"],
  sectionNames: [],
  schema: { addressTypes: ["Talmud", "Integer"], sectionNames: ["Daf", "Line"], lengths: [127, 2749] },
} as unknown as BookIndex;

// Real Zohar leaves have `titles: [{lang, text, primary}]`, not a `title` string.
const ZOHAR: BookIndex = {
  title: "Zohar",
  heTitle: "זהר",
  categories: ["Kabbalah"],
  sectionNames: [],
  schema: {
    nodes: [
      { key: "Introduction", titles: [{ lang: "en", text: "Introduction", primary: true }, { lang: "he", text: "הקדמה", primary: true }] },
      {
        key: "Addenda",
        nodes: [
          { key: "Volume I", titles: [{ lang: "en", text: "Volume I", primary: true }] },
          { key: "Volume II", titles: [{ lang: "en", text: "Volume II", primary: true }] },
        ],
      },
    ],
  },
} as unknown as BookIndex;

describe("resolveStructure", () => {
  it("Genesis -> integer, 50 chapters, first ref = 'Genesis 1'", () => {
    const s = resolveStructure(GENESIS, "Genesis");
    expect(s.kind).toBe("integer");
    expect(s.items).toHaveLength(50);
    expect(s.firstRef).toBe("Genesis 1");
    expect(s.unitName).toBe("Chapter");
  });

  it("Berakhot -> talmud, does NOT generate segment '1' (this was the bug)", () => {
    const s = resolveStructure(BERAKHOT, "Berakhot");
    expect(s.kind).toBe("talmud");
    expect(s.items.some((i) => i.segment === "1")).toBe(false);
    expect(s.firstSegment).toBe("2a");
    expect(s.firstRef).toBe("Berakhot 2a");
    expect(s.unitName).toBe("Daf");
  });

  it("Zohar -> complex, first ref is a named section, not 'Zohar 1'", () => {
    const s = resolveStructure(ZOHAR, "Zohar");
    expect(s.kind).toBe("complex");
    expect(s.firstRef).not.toBe("Zohar 1");
    expect(s.firstRef).toBe("Zohar, Introduction");
    expect(s.items.map((i) => i.ref)).toContain("Zohar, Addenda, Volume I");
  });

  it("every item has a non-empty ref and a segment usable in a URL", () => {
    for (const idx of [GENESIS, BERAKHOT, ZOHAR]) {
      for (const item of resolveStructure(idx, idx.title).items) {
        expect(item.ref.trim()).not.toBe("");
        expect(() => encodeURIComponent(item.segment)).not.toThrow();
      }
    }
  });
});

describe("findFirstReadableRef — skips empty leading sections", () => {
  function textResult(ref: string, indexTitle: string, hasText: boolean, next: string | null): TextLookupResult {
    return { ref, indexTitle, text: hasText ? ["some text"] : [], he: [], next };
  }

  it("returns the structural first ref immediately when it already has content", async () => {
    const structure = resolveStructure(BERAKHOT, "Berakhot");
    const fetchText = async (ref: string) => textResult(ref, "Berakhot", true, "Berakhot 2b");
    expect(await findFirstReadableRef(structure, fetchText)).toEqual({ ref: "Berakhot 2a", segment: "2a" });
  });

  it("follows `next` past empty sections to real content (the sparse-commentary case)", async () => {
    const structure = resolveStructure(BERAKHOT, "Berakhot");
    const calls: string[] = [];
    const fetchText = async (ref: string) => {
      calls.push(ref);
      if (ref === "Berakhot 2a") return textResult(ref, "Berakhot", false, "Berakhot 6b");
      return textResult(ref, "Berakhot", true, "Berakhot 7a");
    };
    const result = await findFirstReadableRef(structure, fetchText);
    expect(result).toEqual({ ref: "Berakhot 6b", segment: "6b" });
    expect(calls).toEqual(["Berakhot 2a", "Berakhot 6b"]);
  });

  it("returns null when every section is empty and next runs out", async () => {
    const structure = resolveStructure(BERAKHOT, "Berakhot");
    const fetchText = async (ref: string) => textResult(ref, "Berakhot", false, null);
    expect(await findFirstReadableRef(structure, fetchText)).toBeNull();
  });

  it("returns null when the structure has no first ref at all", async () => {
    const empty = { kind: "unknown" as const, unitName: "Phần", items: [], firstRef: null, firstSegment: null };
    expect(await findFirstReadableRef(empty, async () => textResult("x", "x", true, null))).toBeNull();
  });

  it("derives the segment correctly for a comma-joined complex ref", async () => {
    const structure = resolveStructure(ZOHAR, "Zohar");
    const fetchText = async (ref: string) => textResult(ref, "Zohar", true, null);
    expect(await findFirstReadableRef(structure, fetchText)).toEqual({
      ref: "Zohar, Introduction",
      segment: "Introduction",
    });
  });

  it("handles a fully-specified verse ref where text/he are plain strings, not arrays", async () => {
    // Regression: Sefaria returns a bare string (not string[]) for a fully
    // specified single-verse ref, e.g. "Book 1:2" — this crashed the naive
    // `.some()` check when `next` skipped past an empty chapter into a
    // partially-populated one.
    const structure = resolveStructure(BERAKHOT, "Berakhot");
    const fetchText = async (ref: string): Promise<TextLookupResult> => {
      if (ref === "Berakhot 2a") return { ref, indexTitle: "Berakhot", text: "", he: "", next: "Berakhot 1:2" };
      return { ref, indexTitle: "Berakhot", text: "some verse text", he: "", next: null };
    };
    expect(await findFirstReadableRef(structure, fetchText)).toEqual({ ref: "Berakhot 1:2", segment: "1:2" });
  });
});

describe("segmentFromRef", () => {
  it("strips a space-joined numeric/daf prefix", () => {
    expect(segmentFromRef("Genesis 5", "Genesis")).toBe("5");
    expect(segmentFromRef("Berakhot 2a", "Berakhot")).toBe("2a");
  });

  it("strips a comma-joined complex-node prefix, even with no trailing number", () => {
    // Regression: this is the exact ref shape ReaderPage's prev/next nav
    // links receive for complex-schema books when the adjacent section is a
    // bare node with no per-node length data (see ADR 0001). The previous
    // implementation split on the LAST space in the whole ref, which chopped
    // the final word off as a fake "chapter" instead of using the known
    // index title to find the real boundary — producing a ref that doesn't
    // exist and 500ing /doc/[book]/[chapter].
    expect(
      segmentFromRef(
        "Guide for the Perplexed, Introduction of Ibn Tibon",
        "Guide for the Perplexed",
      ),
    ).toBe("Introduction of Ibn Tibon");
    expect(
      segmentFromRef("Guide for the Perplexed, Prefatory Remarks", "Guide for the Perplexed"),
    ).toBe("Prefatory Remarks");
  });

  it("strips a deeply-nested comma-joined prefix down to the full remaining path", () => {
    expect(
      segmentFromRef("Zohar, Addenda, Volume I", "Zohar"),
    ).toBe("Addenda, Volume I");
  });

  it("falls back to returning the ref unchanged when it doesn't start with the index title", () => {
    expect(segmentFromRef("Exodus 1", "Genesis")).toBe("Exodus 1");
  });
});

describe("isValidSegment — rejects made-up URLs", () => {
  it("Berakhot: 2a is valid, 999 and 1 are not", () => {
    const s = resolveStructure(BERAKHOT, "Berakhot");
    expect(isValidSegment(s, "2a")).toBe(true);
    expect(isValidSegment(s, "999")).toBe(false);
    expect(isValidSegment(s, "1")).toBe(false);
  });
  it("Genesis: 50 is valid, 51 is not", () => {
    const s = resolveStructure(GENESIS, "Genesis");
    expect(isValidSegment(s, "50")).toBe(true);
    expect(isValidSegment(s, "51")).toBe(false);
  });
});

describe("isRefRefinement — detects Sefaria silently clamping an out-of-range ref", () => {
  it("exact match is always a refinement", () => {
    expect(isRefRefinement("Genesis 5", "Genesis 5")).toBe(true);
  });

  it("the crawler-trap bug: Berakhot 999 clamped to Berakhot 2a is NOT a refinement", () => {
    expect(isRefRefinement("Berakhot 999", "Berakhot 2a")).toBe(false);
    expect(isRefRefinement("Berakhot 5000", "Berakhot 2a")).toBe(false);
  });

  it("a bare complex-node ref auto-resolving to its first section IS a refinement", () => {
    expect(isRefRefinement("Zohar, Introduction", "Zohar, Introduction 1")).toBe(true);
    expect(isRefRefinement("Zohar, Addenda", "Zohar, Addenda, Volume I")).toBe(true);
  });

  it("does not false-positive on a numeric string prefix (5 vs 50)", () => {
    expect(isRefRefinement("Genesis 5", "Genesis 50")).toBe(false);
  });

  it("an unrelated ref is not a refinement", () => {
    expect(isRefRefinement("Genesis 51", "Exodus 1")).toBe(false);
  });
});
