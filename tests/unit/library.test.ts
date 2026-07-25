import { describe, it, expect } from "vitest";
import {
  flattenBooks,
  groupByCategory,
  sortCategories,
  categorySlug,
  categoryFromSlug,
  searchBooks,
  CATEGORY_ORDER,
} from "@/lib/library";
import type { IndexNode } from "@/lib/sefaria";

const FIXTURE: IndexNode[] = [
  {
    category: "Tanakh",
    contents: [
      {
        category: "Torah",
        contents: [
          { title: "Genesis", heTitle: "בראשית", categories: ["Tanakh", "Torah"] },
          { title: "Exodus", heTitle: "שמות", categories: ["Tanakh", "Torah"] },
        ],
      },
      { title: "Psalms", heTitle: "תהילים", categories: ["Tanakh", "Writings"] },
    ],
  },
  { category: "Talmud", contents: [{ title: "Berakhot", heTitle: "ברכות", categories: ["Talmud", "Bavli"] }] },
];

describe("flattenBooks", () => {
  it("flattens a nested tree into a flat list", () => {
    const b = flattenBooks(FIXTURE);
    expect(b.map((x) => x.title).sort()).toEqual(["Berakhot", "Exodus", "Genesis", "Psalms"]);
  });
  it("keeps the node's categoryPath", () => {
    const g = flattenBooks(FIXTURE).find((x) => x.title === "Genesis")!;
    expect(g.categoryPath[0]).toBe("Tanakh");
  });
  it("falls back heTitle to title when missing", () => {
    expect(flattenBooks([{ title: "X" }])[0].heTitle).toBe("X");
  });
});

describe("groupByCategory + sortCategories", () => {
  it("groups by the top-level category", () => {
    const g = groupByCategory(flattenBooks(FIXTURE));
    expect(g.get("Tanakh")).toHaveLength(3);
    expect(g.get("Talmud")).toHaveLength(1);
  });
  it("orders by CATEGORY_ORDER, unknown categories last", () => {
    const s = sortCategories([["Talmud", 1], ["Tanakh", 1], ["Zzz", 1]] as [string, number][]);
    expect(s.map(([k]) => k)).toEqual(["Tanakh", "Talmud", "Zzz"]);
  });
});

describe("categorySlug <-> categoryFromSlug", () => {
  it("round-trips for every category in CATEGORY_ORDER", () => {
    for (const c of CATEGORY_ORDER) {
      expect(categoryFromSlug(categorySlug(c), CATEGORY_ORDER as unknown as string[])).toBe(c);
    }
  });
  it("Jewish Thought -> Jewish-Thought", () => {
    expect(categorySlug("Jewish Thought")).toBe("Jewish-Thought");
  });
});

describe("searchBooks", () => {
  const books = flattenBooks(FIXTURE);
  it("matches the English title", () => {
    expect(searchBooks(books, "genesis")[0].title).toBe("Genesis");
  });
  it("matches the Vietnamese name via vi.ts", () => {
    expect(searchBooks(books, "Thi Thiên")[0].title).toBe("Psalms");
  });
  it("matches with Vietnamese diacritics stripped", () => {
    expect(searchBooks(books, "thi thien")[0].title).toBe("Psalms");
  });
  it("matches the Hebrew title", () => {
    expect(searchBooks(books, "בראשית")[0].title).toBe("Genesis");
  });
  it("returns an empty array for a blank query", () => {
    expect(searchBooks(books, "   ")).toEqual([]);
  });
  it("respects the limit", () => {
    expect(searchBooks(books, "a", 2).length).toBeLessThanOrEqual(2);
  });
});
