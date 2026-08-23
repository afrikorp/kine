import { describe, expect, it } from "vitest";
import fixture017 from "../../../packages/cnam-format/test/fixtures/bordereau-017-2024.json" with { type: "json" };
import { api, setupAndLogin } from "./helpers.js";

interface FixtureFacture {
  numero: number;
  anneeFacture: number;
  decision: { bureau: string; annee: number; ordre: number };
  assure: { racine: string; cle: string };
  seancesParSemaine: number;
  nbSeances: number;
  dateDebut: string;
  dateFin: string;
  tauxTVA: number;
  dateEdition: string;
}

interface Fixture {
  annee: number;
  numero: number;
  praticien: { code: string; cle: string };
  prixUnitaire: number;
  factures: FixtureFacture[];
  _expectedLines: string[];
}

const fixture = fixture017 as unknown as Fixture;

describe("bordereaux — pipeline complet DB -> API -> fichier CNAM", () => {
  it(
    "reproduit le bordereau réel 017/2024 (32 factures) caractère pour caractère via l'API",
    async () => {
      const cookie = await setupAndLogin();

      const cabinetRes = await api(cookie, "PUT", "/api/cabinet", {
        nom: "AMANI SAMAALI, Kinésithérapeute",
        codeCnamPraticien: fixture.praticien.code,
        cleCnamPraticien: fixture.praticien.cle,
      });
      expect(cabinetRes.status).toBe(200);

      const factureIds: number[] = [];
      for (const f of fixture.factures) {
        const patient: any = await (
          await api(cookie, "POST", "/api/patients", {
            nom: "Patient",
            prenom: `F${f.numero}`,
            numeroAssureRacine: f.assure.racine,
            numeroAssureCle: f.assure.cle,
            qualiteBeneficiaire: "assure",
          })
        ).json();

        const decision: any = await (
          await api(cookie, "POST", `/api/patients/${patient.id}/decisions`, {
            bureau: f.decision.bureau,
            annee: f.decision.annee,
            numeroOrdre: f.decision.ordre,
          })
        ).json();

        const factureRes = await api(cookie, "POST", "/api/factures", {
          decisionId: decision.id,
          numero: f.numero,
          anneeFacture: f.anneeFacture,
          dateDebut: f.dateDebut,
          dateFin: f.dateFin,
          nbSeances: f.nbSeances,
          seancesParSemaine: f.seancesParSemaine,
          dateEdition: f.dateEdition,
          prixUnitaire: fixture.prixUnitaire,
          tauxTva: f.tauxTVA,
        });
        expect(factureRes.status).toBe(201);
        const facture: any = await factureRes.json();
        factureIds.push(facture.id);
      }

      const bordereauRes = await api(cookie, "POST", "/api/bordereaux", {
        numero: fixture.numero,
        annee: fixture.annee,
        factureIds,
      });
      expect(bordereauRes.status).toBe(201);
      const bordereau: any = await bordereauRes.json();

      const fileRes = await api(cookie, "GET", `/api/bordereaux/${bordereau.id}/cnam-file`);
      expect(fileRes.status).toBe(200);
      const content = await fileRes.text();
      const lines = content.split("\n");

      expect(lines).toHaveLength(fixture._expectedLines.length);
      expect(lines).toEqual(fixture._expectedLines);
    },
    30_000,
  );
});
