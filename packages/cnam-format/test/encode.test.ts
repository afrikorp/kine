import { describe, expect, it } from "vitest";
import type { BordereauCnamSource } from "../src/types.js";
import { encodeBordereauHeaderLine, encodeFactureLine, encodeBordereauLines, LINE_WIDTH } from "../src/encode.js";
import bordereau017 from "./fixtures/bordereau-017-2024.json" with { type: "json" };
import bordereau014 from "./fixtures/bordereau-014-2024.json" with { type: "json" };
import bordereau012 from "./fixtures/bordereau-012-2024.json" with { type: "json" };

interface Fixture {
  annee: number;
  numero: number;
  praticien: { code: string; cle: string };
  prixUnitaire: number;
  factures: Array<BordereauCnamSource["factures"][number]>;
  _expectedLines: string[];
}

const fixtures = [bordereau017, bordereau014, bordereau012] as unknown as Fixture[];

function toBordereau(fixture: Fixture): BordereauCnamSource {
  return {
    annee: fixture.annee,
    numero: fixture.numero,
    praticien: fixture.praticien,
    factures: fixture.factures,
  };
}

describe("génération du fichier électronique CNAM — régénération byte-for-byte des 3 bordereaux réels", () => {
  for (const fixture of fixtures) {
    const label = `${String(fixture.numero).padStart(3, "0")}/${fixture.annee}`;
    const bordereau = toBordereau(fixture);

    describe(`bordereau ${label} (${fixture.factures.length} factures)`, () => {
      it("chaque ligne générée fait exactement 135 caractères", () => {
        const lines = encodeBordereauLines(bordereau);
        for (const line of lines) {
          expect(line.length).toBe(LINE_WIDTH);
        }
      });

      it("la ligne d'en-tête est identique caractère pour caractère à l'échantillon réel", () => {
        expect(encodeBordereauHeaderLine(bordereau)).toBe(fixture._expectedLines[0]);
      });

      fixture.factures.forEach((facture, i) => {
        it(`la ligne de détail de la facture n°${facture.numero}/${facture.anneeFacture} est identique caractère pour caractère`, () => {
          expect(encodeFactureLine(bordereau, facture)).toBe(fixture._expectedLines[i + 1]);
        });
      });

      it("le fichier complet régénéré est identique caractère pour caractère à l'échantillon réel", () => {
        const lines = encodeBordereauLines(bordereau);
        expect(lines).toEqual(fixture._expectedLines);
      });
    });
  }

  it("régénère les 81 lignes de détail + 3 en-têtes des 3 échantillons sans aucune différence", () => {
    const allExpected = fixtures.flatMap((f) => f._expectedLines);
    const allGenerated = fixtures.flatMap((f) => encodeBordereauLines(toBordereau(f)));
    expect(allGenerated.length).toBe(84);
    expect(allExpected.length).toBe(84);
    expect(allGenerated).toEqual(allExpected);
  });
});
