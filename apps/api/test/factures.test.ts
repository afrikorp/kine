import { describe, expect, it } from "vitest";
import { api, createDecision, createPatient, setupAndLogin } from "./helpers.js";

describe("factures", () => {
  it("calcule TTC/HT/TVA à partir du tarif en vigueur (seed : 11,5 DT / 7%)", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie, { numeroAssureRacine: "9875710", numeroAssureCle: "0" });
    const decision = await createDecision(cookie, patient.id, { bureau: "40", annee: 2025, numeroOrdre: 10836 });

    // Reproduit la facture réelle n°459 du bordereau 017/2024 (fixture @kine/cnam-format).
    const res = await api(cookie, "POST", "/api/factures", {
      decisionId: decision.id,
      dateDebut: "2025-06-02",
      dateFin: "2025-06-27",
      nbSeances: 12,
      seancesParSemaine: 3,
      dateEdition: "2026-03-08",
    });
    expect(res.status).toBe(201);
    const facture = await res.json();
    expect(facture).toMatchObject({
      prixUnitaire: 11.5,
      tauxTva: 7,
      montantTtc: 138,
      montantHt: 128.972,
      montantTva: 9.028,
      anneeFacture: 2026,
      numero: 1,
    });
  });

  it("numérote les factures séquentiellement par année", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);

    const body = {
      decisionId: decision.id,
      dateDebut: "2025-01-06",
      dateFin: "2025-01-20",
      nbSeances: 4,
      seancesParSemaine: 2,
      dateEdition: "2025-01-25",
      anneeFacture: 2025,
    };
    const f1: any = await (await api(cookie, "POST", "/api/factures", body)).json();
    const f2: any = await (await api(cookie, "POST", "/api/factures", body)).json();
    expect(f1.numero).toBe(1);
    expect(f2.numero).toBe(2);
  });

  it("rejette un rythme de séances hors {2,3,4}", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const res = await api(cookie, "POST", "/api/factures", {
      decisionId: decision.id,
      dateDebut: "2025-01-06",
      dateFin: "2025-01-20",
      nbSeances: 4,
      seancesParSemaine: 5,
      dateEdition: "2025-01-25",
    });
    expect(res.status).toBe(400);
  });

  it("empêche la modification d'une facture déjà transmise dans un bordereau", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const facture: any = await (
      await api(cookie, "POST", "/api/factures", {
        decisionId: decision.id,
        dateDebut: "2025-01-06",
        dateFin: "2025-01-20",
        nbSeances: 4,
        seancesParSemaine: 2,
        dateEdition: "2025-01-25",
        anneeFacture: 2025,
      })
    ).json();

    await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [facture.id] });

    const res = await api(cookie, "PUT", `/api/factures/${facture.id}`, {
      decisionId: decision.id,
      dateDebut: "2025-01-06",
      dateFin: "2025-01-20",
      nbSeances: 8,
      seancesParSemaine: 2,
      dateEdition: "2025-01-25",
    });
    expect(res.status).toBe(409);
  });

  it("mémoire des séances : dates hebdomadaires excluant les dimanches", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const facture: any = await (
      await api(cookie, "POST", "/api/factures", {
        decisionId: decision.id,
        dateDebut: "2025-06-02",
        dateFin: "2025-06-27",
        nbSeances: 12,
        seancesParSemaine: 3,
        dateEdition: "2026-03-08",
      })
    ).json();

    const res = await api(cookie, "GET", `/api/factures/${facture.id}/memoire-seances`);
    expect(res.status).toBe(200);
    const dates = (await res.json()) as Array<{ numero: number; date: string }>;
    expect(dates).toHaveLength(12);
    expect(dates[0]).toEqual({ numero: 1, date: "2025-06-02" });
    expect(dates[dates.length - 1]).toEqual({ numero: 12, date: "2025-06-27" });
    for (const { date } of dates) {
      const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
      expect(wd).not.toBe(0);
    }
  });
});
