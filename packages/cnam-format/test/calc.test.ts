import { describe, expect, it } from "vitest";
import { computeInvoiceAmounts } from "../src/calc.js";
import bordereau017 from "./fixtures/bordereau-017-2024.json" with { type: "json" };
import bordereau014 from "./fixtures/bordereau-014-2024.json" with { type: "json" };
import bordereau012 from "./fixtures/bordereau-012-2024.json" with { type: "json" };

const fixtures = [bordereau017, bordereau014, bordereau012];

describe("computeInvoiceAmounts", () => {
  for (const bordereau of fixtures) {
    describe(`bordereau ${String(bordereau.numero).padStart(3, "0")}/${bordereau.annee}`, () => {
      for (const facture of bordereau.factures) {
        it(`facture n°${facture.numero}/${facture.anneeFacture} : TTC/HT/TVA recalculés depuis nb_séances × prix unitaire`, () => {
          const result = computeInvoiceAmounts({
            nbSeances: facture.nbSeances,
            prixUnitaire: bordereau.prixUnitaire,
            tauxTVA: facture.tauxTVA,
          });
          expect(result.montantTTC).toBeCloseTo(facture.montantTTC, 3);
          expect(result.montantHT).toBeCloseTo(facture.montantHT, 3);
          expect(result.montantTVA).toBeCloseTo(facture.montantTVA, 3);
        });
      }
    });
  }
});
