/** Converts 1..~600 to a Hebrew numeral. 15/16 use טו/טז, not יה/יו (avoids spelling out God's name). */
export function toHebrewNumeral(n: number): string {
  if (n <= 0) return String(n);
  const map: [number, string][] = [
    [400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"],
    [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"],
    [19, "יט"], [18, "יח"], [17, "יז"], [16, "טז"], [15, "טו"],
    [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"],
  ];
  let s = "";
  let v = n;
  for (const [num, letter] of map) {
    while (v >= num) {
      s += letter;
      v -= num;
    }
  }
  return s || String(n);
}
