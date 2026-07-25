import { describe, it, expect } from "vitest";
import { toHebrewNumeral } from "@/lib/hebrew-numeral";

describe("toHebrewNumeral", () => {
  it.each([
    [1, "א"], [2, "ב"], [10, "י"], [11, "יא"],
    [15, "טו"], // SPECIAL CASE: not יה (avoids spelling out God's name)
    [16, "טז"], // SPECIAL CASE: not יו
    [20, "כ"], [100, "ק"], [400, "ת"], [500, "תק"],
  ])("%i -> %s", (n, expected) => {
    expect(toHebrewNumeral(n)).toBe(expected);
  });

  it("never produces יה or יו for 15/16", () => {
    expect(toHebrewNumeral(15)).not.toBe("יה");
    expect(toHebrewNumeral(16)).not.toBe("יו");
  });

  it("returns a non-empty string for every n in 1..600", () => {
    for (let i = 1; i <= 600; i++) expect(toHebrewNumeral(i).length).toBeGreaterThan(0);
  });
});
