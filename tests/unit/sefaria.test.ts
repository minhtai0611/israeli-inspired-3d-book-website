import { describe, it, expect } from "vitest";
import { cleanText, flatten } from "@/lib/sefaria";

describe("cleanText", () => {
  it("strips <sup> footnote markers", () => {
    expect(cleanText("In <sup class='footnote-marker'>a</sup>the beginning")).toBe("In the beginning");
  });
  it("strips any HTML tag", () => {
    expect(cleanText("<b>Hello</b> <i>world</i>")).toBe("Hello world");
  });
  it("decodes &nbsp; &amp; &thinsp;", () => {
    expect(cleanText("a&nbsp;b&amp;c&thinsp;d")).toBe("a b&c d");
  });
  it("collapses repeated whitespace", () => {
    expect(cleanText("  a    b  ")).toBe("a b");
  });
});

describe("flatten", () => {
  it("flattens a 2D array", () => {
    expect(flatten([["a", "b"], ["c"]])).toEqual(["a", "b", "c"]);
  });
  it("passes through a 1D array unchanged", () => {
    expect(flatten(["a", "b"])).toEqual(["a", "b"]);
  });
  it("drops empty entries", () => {
    expect(flatten(["a", "", "b"])).toEqual(["a", "b"]);
  });
});
