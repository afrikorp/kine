import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import type { DecisionCnamRow, PatientRow } from "../db/schema.js";
import { mapDecision } from "../db/queries.js";
import { conflict, notFound, requireInt, requireString } from "../lib/http.js";

export const decisionsRoutes = new Hono<AppEnv>();

decisionsRoutes.get("/patients/:patientId/decisions", async (c) => {
  const patientId = Number(c.req.param("patientId"));
  const { results } = await c.env.DB.prepare("SELECT * FROM decisions_cnam WHERE patient_id = ? ORDER BY annee DESC")
    .bind(patientId)
    .all<DecisionCnamRow>();
  return c.json(results.map(mapDecision));
});

decisionsRoutes.post("/patients/:patientId/decisions", async (c) => {
  const patientId = Number(c.req.param("patientId"));
  const patient = await c.env.DB.prepare("SELECT * FROM patients WHERE id = ?").bind(patientId).first<PatientRow>();
  if (!patient) notFound("Patient introuvable");

  const body = await c.req.json();
  const bureau = requireString(body.bureau, "bureau");
  const annee = requireInt(body.annee, "annee");
  const numeroOrdre = requireInt(body.numeroOrdre, "numeroOrdre");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM decisions_cnam WHERE bureau = ? AND annee = ? AND numero_ordre = ?",
  )
    .bind(bureau, annee, numeroOrdre)
    .first();
  if (existing) conflict(`La décision ${bureau}/${annee}/${numeroOrdre} existe déjà`);

  const row = await c.env.DB.prepare(
    "INSERT INTO decisions_cnam (patient_id, bureau, annee, numero_ordre) VALUES (?, ?, ?, ?) RETURNING *",
  )
    .bind(patientId, bureau, annee, numeroOrdre)
    .first<DecisionCnamRow>();

  return c.json(mapDecision(row!), 201);
});

decisionsRoutes.get("/decisions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM decisions_cnam WHERE id = ?").bind(id).first<DecisionCnamRow>();
  if (!row) notFound("Décision introuvable");
  return c.json(mapDecision(row!));
});

decisionsRoutes.delete("/decisions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const { count } = (await c.env.DB.prepare("SELECT count(*) as count FROM factures WHERE decision_id = ?")
    .bind(id)
    .first<{ count: number }>())!;
  if (count > 0) conflict("Cette décision a des factures liées et ne peut pas être supprimée");

  const result = await c.env.DB.prepare("DELETE FROM decisions_cnam WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) notFound("Décision introuvable");
  return c.json({ ok: true });
});
