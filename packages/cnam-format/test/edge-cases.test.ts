import { describe, expect, it } from "vitest";
import type { BordereauCnamSource, FactureCnamSource } from "../src/types.js";
import { encodeFactureLine, encodeBordereauHeaderLine } from "../src/encode.js";

const bordereau: BordereauCnamSource = {
  annee: 2026,
  numero: 1,
  praticien: { code: "29875", cle: "96" },
  factures: [],
};

function baseFacture(overrides: Partial<FactureCnamSource> = {}): FactureCnamSource {
  return {
    numero: 459,
    anneeFacture: 2026,
    decision: { bureau: "40", annee: 2026, ordre: 10836 },
    assure: { racine: "9875710", cle: "0" },
    seancesParSemaine: 3,
    nbSeances: 12,
    dateDebut: "2026-06-02",
    dateFin: "2026-06-27",
    tauxTVA: 7,
    montantTTC: 138,
    montantHT: 128.972,
    montantTVA: 9.028,
    dateEdition: "2026-08-23",
    ...overrides,
  };
}

describe("cas limites documentés dans la spec (à confirmer avant le premier dépôt réel)", () => {
  it("n° de facture à 4 chiffres (>= 1000) : tient toujours sur le champ 10 caractères", () => {
    const line = encodeFactureLine(bordereau, baseFacture({ numero: 1459 }));
    expect(line.length).toBe(135);
    expect(line.slice(24, 34)).toBe("      1459");
  });

  it("montant TTC >= 999,9 DT : dépasse le champ 4 chiffres, doit lever une erreur explicite plutôt que tronquer", () => {
    expect(() => encodeFactureLine(bordereau, baseFacture({ montantTTC: 1000 }))).toThrow();
  });

  it("montant HT >= 999,999 DT : dépasse le champ 6 chiffres, doit lever une erreur explicite", () => {
    expect(() => encodeFactureLine(bordereau, baseFacture({ montantHT: 1000 }))).toThrow();
  });

  it("montant TVA >= 99,999 DT : dépasse le champ 5 chiffres, doit lever une erreur explicite", () => {
    expect(() => encodeFactureLine(bordereau, baseFacture({ montantTVA: 100 }))).toThrow();
  });

  it("taux de TVA à deux chiffres (ex: 19%) : le format n'a qu'un seul chiffre, doit lever une erreur explicite", () => {
    expect(() => encodeFactureLine(bordereau, baseFacture({ tauxTVA: 19 }))).toThrow();
  });

  it("TTC total du bordereau >= 9999,9 DT : dépasse le champ 5 chiffres de l'en-tête, doit lever une erreur explicite", () => {
    const grosBordereau: BordereauCnamSource = {
      ...bordereau,
      factures: Array.from({ length: 90 }, (_, i) => baseFacture({ numero: 1000 + i, montantTTC: 138 })),
    };
    expect(() => encodeBordereauHeaderLine(grosBordereau)).toThrow();
  });

  it("plus de 99 factures dans un bordereau : dépasse le champ 2 chiffres du nombre de lignes, doit lever une erreur explicite", () => {
    const grosBordereau: BordereauCnamSource = {
      ...bordereau,
      factures: Array.from({ length: 100 }, (_, i) => baseFacture({ numero: 1000 + i, montantTTC: 1 })),
    };
    expect(() => encodeBordereauHeaderLine(grosBordereau)).toThrow();
  });
});
