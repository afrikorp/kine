import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import type { JourFerieRow, ParametreTarifRow } from "../db/schema.js";
import { resolveTarif } from "../db/queries.js";
import { badRequest, requireIsoDate, requireNumber, requireString } from "../lib/http.js";

export const parametresRoutes = new Hono<AppEnv>();

function mapTarif(row: ParametreTarifRow) {
  return { id: row.id, prixUnitaire: row.prix_unitaire, tauxTva: row.taux_tva, dateEffet: row.date_effet };
}

function mapJourFerie(row: JourFerieRow) {
  return { id: row.id, date: row.date, libelle: row.libelle };
}

parametresRoutes.get("/tarif", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM parametres_tarif ORDER BY date_effet DESC").all<
    ParametreTarifRow
  >();
  return c.json(results.map(mapTarif));
});

parametresRoutes.get("/tarif/actuel", async (c) => {
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const tarif = await resolveTarif(c.env.DB, date);
  if (!tarif) return c.json({ error: "Aucun tarif en vigueur à cette date" }, 404);
  return c.json(tarif);
});

parametresRoutes.post("/tarif", async (c) => {
  const body = await c.req.json();
  const prixUnitaire = requireNumber(body.prixUnitaire, "prixUnitaire");
  const tauxTva = requireNumber(body.tauxTva, "tauxTva");
  const dateEffet = requireIsoDate(body.dateEffet, "dateEffet");
  if (prixUnitaire <= 0) badRequest("prixUnitaire doit être positif");
  if (tauxTva < 0) badRequest("tauxTva doit être positif ou nul");

  const row = await c.env.DB.prepare(
    "INSERT INTO parametres_tarif (prix_unitaire, taux_tva, date_effet) VALUES (?, ?, ?) RETURNING *",
  )
    .bind(prixUnitaire, tauxTva, dateEffet)
    .first<ParametreTarifRow>();
  return c.json(mapTarif(row!), 201);
});

parametresRoutes.get("/jours-feries", async (c) => {
  const annee = c.req.query("annee");
  const stmt = annee
    ? c.env.DB.prepare("SELECT * FROM jours_feries WHERE date LIKE ? ORDER BY date ASC").bind(`${annee}-%`)
    : c.env.DB.prepare("SELECT * FROM jours_feries ORDER BY date ASC");
  const { results } = await stmt.all<JourFerieRow>();
  return c.json(results.map(mapJourFerie));
});

parametresRoutes.post("/jours-feries", async (c) => {
  const body = await c.req.json();
  const date = requireIsoDate(body.date, "date");
  const libelle = requireString(body.libelle, "libelle");

  const row = await c.env.DB.prepare("INSERT INTO jours_feries (date, libelle) VALUES (?, ?) RETURNING *")
    .bind(date, libelle)
    .first<JourFerieRow>();
  return c.json(mapJourFerie(row!), 201);
});

parametresRoutes.delete("/jours-feries/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM jours_feries WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
