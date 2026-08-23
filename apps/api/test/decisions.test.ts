import { describe, expect, it } from "vitest";
import { api, createDecision, createPatient, setupAndLogin } from "./helpers.js";

describe("décisions CNAM", () => {
  it("crée une décision liée à un patient", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id, { bureau: "40", annee: 2025, numeroOrdre: 13819 });
    expect(decision).toMatchObject({ bureau: "40", annee: 2025, numeroOrdre: 13819, patientId: patient.id });
  });

  it("refuse une décision en doublon (bureau/année/ordre)", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    await createDecision(cookie, patient.id, { numeroOrdre: 111 });
    const res = await api(cookie, "POST", `/api/patients/${patient.id}/decisions`, {
      bureau: "40",
      annee: 2025,
      numeroOrdre: 111,
    });
    expect(res.status).toBe(409);
  });

  it("404 si le patient n'existe pas", async () => {
    const cookie = await setupAndLogin();
    const res = await api(cookie, "POST", "/api/patients/999999/decisions", {
      bureau: "40",
      annee: 2025,
      numeroOrdre: 1,
    });
    expect(res.status).toBe(404);
  });

  it("refuse de supprimer une décision qui a une facture liée", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const decision = await createDecision(cookie, patient.id);
    await api(cookie, "POST", "/api/factures", {
      decisionId: decision.id,
      dateDebut: "2025-06-02",
      dateFin: "2025-06-27",
      nbSeances: 12,
      seancesParSemaine: 3,
      dateEdition: "2025-07-01",
    });

    const res = await api(cookie, "DELETE", `/api/decisions/${decision.id}`);
    expect(res.status).toBe(409);
  });
});
