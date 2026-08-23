import { describe, expect, it } from "vitest";
import { api, createDecision, createPatient, setupAndLogin } from "./helpers.js";

describe("patients", () => {
  it("crée puis relit un patient", async () => {
    const cookie = await setupAndLogin();
    const created = await createPatient(cookie, { nom: "Ben Ali", prenom: "Sami" });
    expect(created).toMatchObject({ nom: "Ben Ali", prenom: "Sami", qualiteBeneficiaire: "assure" });

    const res = await api(cookie, "GET", `/api/patients/${created.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: created.id, nom: "Ben Ali" });
  });

  it("rejette une qualité de bénéficiaire invalide", async () => {
    const cookie = await setupAndLogin();
    const res = await api(cookie, "POST", "/api/patients", {
      nom: "X",
      prenom: "Y",
      numeroAssureRacine: "123",
      numeroAssureCle: "0",
      qualiteBeneficiaire: "cousin",
    });
    expect(res.status).toBe(400);
  });

  it("recherche par nom", async () => {
    const cookie = await setupAndLogin();
    await createPatient(cookie, { nom: "Dupont", prenom: "Jean" });
    await createPatient(cookie, { nom: "Durand", prenom: "Marie" });

    const res = await api(cookie, "GET", "/api/patients?q=Dupont");
    const list = (await res.json()) as Array<{ nom: string }>;
    expect(list).toHaveLength(1);
    expect(list[0].nom).toBe("Dupont");
  });

  it("met à jour un patient", async () => {
    const cookie = await setupAndLogin();
    const created = await createPatient(cookie);
    const res = await api(cookie, "PUT", `/api/patients/${created.id}`, {
      nom: created.nom,
      prenom: created.prenom,
      numeroAssureRacine: created.numeroAssureRacine,
      numeroAssureCle: created.numeroAssureCle,
      qualiteBeneficiaire: created.qualiteBeneficiaire,
      telephone: "12345678",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ telephone: "12345678" });
  });

  it("refuse de supprimer un patient qui a une décision CNAM liée", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    await createDecision(cookie, patient.id);

    const res = await api(cookie, "DELETE", `/api/patients/${patient.id}`);
    expect(res.status).toBe(409);
  });

  it("supprime un patient sans décision liée", async () => {
    const cookie = await setupAndLogin();
    const patient = await createPatient(cookie);
    const res = await api(cookie, "DELETE", `/api/patients/${patient.id}`);
    expect(res.status).toBe(200);
  });
});
