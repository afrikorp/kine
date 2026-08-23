import { describe, expect, it } from "vitest";
import { api, createDecision, createPatient, setupAndLogin } from "./helpers.js";

async function createFacture(cookie: string, decisionId: number, overrides: Record<string, unknown> = {}) {
  const res = await api(cookie, "POST", "/api/factures", {
    decisionId,
    dateDebut: "2025-01-06",
    dateFin: "2025-01-20",
    nbSeances: 4,
    seancesParSemaine: 2,
    dateEdition: "2025-01-25",
    anneeFacture: 2025,
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`createFacture a échoué (${res.status}): ${await res.text()}`);
  return res.json() as Promise<any>;
}

describe("bordereaux — cas limites", () => {
  it("refuse un bordereau en doublon (numéro/année)", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const f1 = await createFacture(cookie, decision.id);
    const f2 = await createFacture(cookie, decision.id, { numero: 2 });

    await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [f1.id] });
    const res = await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [f2.id] });
    expect(res.status).toBe(409);
  });

  it("refuse une facture déjà transmise dans un autre bordereau", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const f1 = await createFacture(cookie, decision.id);

    await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [f1.id] });
    const res = await api(cookie, "POST", "/api/bordereaux", { numero: 2, annee: 2025, factureIds: [f1.id] });
    expect(res.status).toBe(409);
  });

  it("refuse de générer le fichier CNAM sans cabinet configuré", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const f1 = await createFacture(cookie, decision.id);
    const bordereau = await (
      await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [f1.id] })
    ).json();

    const res = await api(cookie, "GET", `/api/bordereaux/${bordereau.id}/cnam-file`);
    expect(res.status).toBe(500);
  });

  it("calcule les totaux et le montant en toutes lettres du bordereau", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    const f1 = await createFacture(cookie, decision.id, { nbSeances: 12, seancesParSemaine: 3 });

    const bordereau = await (
      await api(cookie, "POST", "/api/bordereaux", { numero: 1, annee: 2025, factureIds: [f1.id] })
    ).json();

    const res = await api(cookie, "GET", `/api/bordereaux/${bordereau.id}`);
    const detail: any = await res.json();
    expect(detail.totalTtc).toBe(138);
    expect(detail.totalTtcEnLettres).toBe("Cent trente-huit dinars");
  });
});
