import { describe, expect, it } from "vitest";
import { numberToWords, montantEnLettres } from "../src/nombre-en-lettres.js";

describe("numberToWords", () => {
  const cases: Array<[number, string]> = [
    [0, "zéro"],
    [1, "un"],
    [2, "deux"],
    [10, "dix"],
    [11, "onze"],
    [16, "seize"],
    [17, "dix-sept"],
    [19, "dix-neuf"],
    [20, "vingt"],
    [21, "vingt et un"],
    [22, "vingt-deux"],
    [29, "vingt-neuf"],
    [30, "trente"],
    [31, "trente et un"],
    [40, "quarante"],
    [50, "cinquante"],
    [60, "soixante"],
    [61, "soixante et un"],
    [69, "soixante-neuf"],
    [70, "soixante-dix"],
    [71, "soixante et onze"],
    [72, "soixante-douze"],
    [75, "soixante-quinze"],
    [79, "soixante-dix-neuf"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [89, "quatre-vingt-neuf"],
    [90, "quatre-vingt-dix"],
    [91, "quatre-vingt-onze"],
    [95, "quatre-vingt-quinze"],
    [99, "quatre-vingt-dix-neuf"],
    [100, "cent"],
    [101, "cent un"],
    [110, "cent dix"],
    [111, "cent onze"],
    [199, "cent quatre-vingt-dix-neuf"],
    [200, "deux cents"],
    [201, "deux cent un"],
    [299, "deux cent quatre-vingt-dix-neuf"],
    [300, "trois cents"],
    [999, "neuf cent quatre-vingt-dix-neuf"],
    [1000, "mille"],
    [1001, "mille un"],
    [1100, "mille cent"],
    [1999, "mille neuf cent quatre-vingt-dix-neuf"],
    [2000, "deux mille"],
    [2001, "deux mille un"],
    [10000, "dix mille"],
    [10001, "dix mille un"],
    [21000, "vingt et un mille"],
    [100000, "cent mille"],
    [123456, "cent vingt-trois mille quatre cent cinquante-six"],
    [1000000, "un million"],
    [1000001, "un million un"],
    [2000000, "deux millions"],
  ];

  for (const [n, expected] of cases) {
    it(`${n} -> "${expected}"`, () => {
      expect(numberToWords(n)).toBe(expected);
    });
  }

  it("rejette un nombre négatif ou non entier", () => {
    expect(() => numberToWords(-1)).toThrow();
    expect(() => numberToWords(1.5)).toThrow();
  });
});

describe("montantEnLettres (dinar tunisien / millimes)", () => {
  it("138,972 DT", () => {
    expect(montantEnLettres(138.972)).toBe("Cent trente-huit dinars neuf cent soixante-douze millimes");
  });

  it("11,5 DT (arrondi propre à 500 millimes)", () => {
    expect(montantEnLettres(11.5)).toBe("Onze dinars cinq cents millimes");
  });

  it("montant rond, sans millimes", () => {
    expect(montantEnLettres(207)).toBe("Deux cent sept dinars");
  });

  it("un seul dinar, singulier", () => {
    expect(montantEnLettres(1)).toBe("Un dinar");
  });

  it("un seul millime, singulier", () => {
    expect(montantEnLettres(0.001)).toBe("Zéro dinar un millime");
  });

  it("gère un arrondi flottant qui ferait déborder les millimes (report sur les dinars)", () => {
    expect(montantEnLettres(0.9999999999)).toBe("Un dinar");
  });

  it("rejette un montant négatif", () => {
    expect(() => montantEnLettres(-1)).toThrow();
  });
});
