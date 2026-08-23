import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import type { PatientRow, QualiteBeneficiaire } from "../db/schema.js";
import { mapPatient } from "../db/queries.js";
import { conflict, notFound, optionalString, requireEnum, requireString } from "../lib/http.js";

export const patientsRoutes = new Hono<AppEnv>();

const QUALITES: readonly QualiteBeneficiaire[] = ["assure", "conjoint", "enfant", "ascendant", "autre"];

patientsRoutes.get("/", async (c) => {
  const q = c.req.query("q");
  const stmt = q
    ? c.env.DB.prepare(
        "SELECT * FROM patients WHERE nom LIKE ? OR prenom LIKE ? OR numero_assure_racine LIKE ? ORDER BY nom, prenom",
      ).bind(`%${q}%`, `%${q}%`, `%${q}%`)
    : c.env.DB.prepare("SELECT * FROM patients ORDER BY nom, prenom");
  const { results } = await stmt.all<PatientRow>();
  return c.json(results.map(mapPatient));
});

patientsRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM patients WHERE id = ?").bind(id).first<PatientRow>();
  if (!row) notFound("Patient introuvable");
  return c.json(mapPatient(row!));
});

patientsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const nom = requireString(body.nom, "nom");
  const prenom = requireString(body.prenom, "prenom");
  const numeroAssureRacine = requireString(body.numeroAssureRacine, "numeroAssureRacine");
  const numeroAssureCle = requireString(body.numeroAssureCle, "numeroAssureCle");
  const qualiteBeneficiaire = requireEnum(body.qualiteBeneficiaire, "qualiteBeneficiaire", QUALITES);

  const row = await c.env.DB.prepare(
    `INSERT INTO patients
       (nom, prenom, numero_assure_racine, numero_assure_cle, qualite_beneficiaire, telephone, adresse, date_naissance, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(
      nom,
      prenom,
      numeroAssureRacine,
      numeroAssureCle,
      qualiteBeneficiaire,
      optionalString(body.telephone),
      optionalString(body.adresse),
      body.dateNaissance ?? null,
      optionalString(body.notes),
    )
    .first<PatientRow>();

  return c.json(mapPatient(row!), 201);
});

patientsRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM patients WHERE id = ?").bind(id).first<PatientRow>();
  if (!existing) notFound("Patient introuvable");

  const body = await c.req.json();
  const nom = requireString(body.nom, "nom");
  const prenom = requireString(body.prenom, "prenom");
  const numeroAssureRacine = requireString(body.numeroAssureRacine, "numeroAssureRacine");
  const numeroAssureCle = requireString(body.numeroAssureCle, "numeroAssureCle");
  const qualiteBeneficiaire = requireEnum(body.qualiteBeneficiaire, "qualiteBeneficiaire", QUALITES);

  const row = await c.env.DB.prepare(
    `UPDATE patients SET
       nom = ?, prenom = ?, numero_assure_racine = ?, numero_assure_cle = ?, qualite_beneficiaire = ?,
       telephone = ?, adresse = ?, date_naissance = ?, notes = ?
     WHERE id = ?
     RETURNING *`,
  )
    .bind(
      nom,
      prenom,
      numeroAssureRacine,
      numeroAssureCle,
      qualiteBeneficiaire,
      optionalString(body.telephone),
      optionalString(body.adresse),
      body.dateNaissance ?? null,
      optionalString(body.notes),
      id,
    )
    .first<PatientRow>();

  return c.json(mapPatient(row!));
});

patientsRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { count } = (await c.env.DB.prepare("SELECT count(*) as count FROM decisions_cnam WHERE patient_id = ?")
    .bind(id)
    .first<{ count: number }>())!;
  if (count > 0) {
    conflict("Ce patient a des décisions CNAM liées et ne peut pas être supprimé");
  }
  const result = await c.env.DB.prepare("DELETE FROM patients WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) notFound("Patient introuvable");
  return c.json({ ok: true });
});
