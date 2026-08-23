import { Hono } from "hono";
import { computeInvoiceAmounts } from "@kine/cnam-format";
import { computeSeanceDates } from "@kine/scheduling";
import type { AppEnv } from "../types.js";
import type { DecisionCnamRow, FactureRow, JourFerieRow } from "../db/schema.js";
import { mapFacture, resolveTarif } from "../db/queries.js";
import { badRequest, conflict, notFound, requireInt, requireIsoDate, requireOneOf } from "../lib/http.js";

export const facturesRoutes = new Hono<AppEnv>();

const RYTHMES = [2, 3, 4] as const;

async function nextNumeroFacture(db: D1Database, anneeFacture: number): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(MAX(numero), 0) + 1 as next FROM factures WHERE annee_facture = ?")
    .bind(anneeFacture)
    .first<{ next: number }>();
  return row!.next;
}

facturesRoutes.get("/", async (c) => {
  const annee = c.req.query("annee");
  const patientId = c.req.query("patientId");
  const bordereauId = c.req.query("bordereauId");
  const sansBordereau = c.req.query("sansBordereau");

  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (annee) {
    conditions.push("f.annee_facture = ?");
    bindings.push(Number(annee));
  }
  if (patientId) {
    conditions.push("d.patient_id = ?");
    bindings.push(Number(patientId));
  }
  if (bordereauId) {
    conditions.push("f.bordereau_id = ?");
    bindings.push(Number(bordereauId));
  }
  if (sansBordereau === "true") {
    conditions.push("f.bordereau_id IS NULL");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await c.env.DB.prepare(
    `SELECT f.*, p.nom as patient_nom, p.prenom as patient_prenom,
            p.numero_assure_racine as patient_numero_assure_racine, p.numero_assure_cle as patient_numero_assure_cle,
            d.bureau, d.annee as decision_annee, d.numero_ordre
     FROM factures f
     JOIN decisions_cnam d ON d.id = f.decision_id
     JOIN patients p ON p.id = d.patient_id
     ${where}
     ORDER BY f.annee_facture DESC, f.numero DESC`,
  )
    .bind(...bindings)
    .all<
      FactureRow & {
        patient_nom: string;
        patient_prenom: string;
        patient_numero_assure_racine: string;
        patient_numero_assure_cle: string;
        bureau: string;
        decision_annee: number;
        numero_ordre: number;
      }
    >();

  return c.json(
    results.map((row) => ({
      ...mapFacture(row),
      patientNom: row.patient_nom,
      patientPrenom: row.patient_prenom,
      patientNumeroAssureRacine: row.patient_numero_assure_racine,
      patientNumeroAssureCle: row.patient_numero_assure_cle,
      decisionBureau: row.bureau,
      decisionAnnee: row.decision_annee,
      decisionNumeroOrdre: row.numero_ordre,
    })),
  );
});

facturesRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first<FactureRow>();
  if (!row) notFound("Facture introuvable");
  return c.json(mapFacture(row!));
});

facturesRoutes.get("/:id/memoire-seances", async (c) => {
  const id = Number(c.req.param("id"));
  const facture = await c.env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first<FactureRow>();
  if (!facture) notFound("Facture introuvable");

  const { results: feries } = await c.env.DB.prepare("SELECT date FROM jours_feries").all<
    Pick<JourFerieRow, "date">
  >();

  const dates = computeSeanceDates({
    dateDebut: facture!.date_debut,
    nbSeances: facture!.nb_seances,
    seancesParSemaine: facture!.seances_par_semaine,
    joursFeries: feries.map((f) => f.date),
  });

  return c.json(dates);
});

async function parseFactureBody(body: any, db: D1Database) {
  const decisionId = requireInt(body.decisionId, "decisionId");
  const decision = await db.prepare("SELECT * FROM decisions_cnam WHERE id = ?").bind(decisionId).first<DecisionCnamRow>();
  if (!decision) notFound("Décision CNAM introuvable");

  const dateDebut = requireIsoDate(body.dateDebut, "dateDebut");
  const dateFin = requireIsoDate(body.dateFin, "dateFin");
  const nbSeances = requireInt(body.nbSeances, "nbSeances");
  if (nbSeances <= 0) badRequest("nbSeances doit être positif");
  const seancesParSemaine = requireOneOf(body.seancesParSemaine, "seancesParSemaine", RYTHMES);
  const dateEdition = requireIsoDate(body.dateEdition, "dateEdition");
  const prestation = typeof body.prestation === "string" && body.prestation ? body.prestation : "75";

  let tarif: { prixUnitaire: number; tauxTva: number };
  if (body.prixUnitaire != null && body.tauxTva != null) {
    tarif = { prixUnitaire: Number(body.prixUnitaire), tauxTva: Number(body.tauxTva) };
  } else {
    const resolved = await resolveTarif(db, dateEdition);
    if (!resolved) badRequest("Aucun tarif en vigueur à la date d'édition — configurez les paramètres tarifaires");
    tarif = resolved!;
  }

  const amounts = computeInvoiceAmounts({ nbSeances, prixUnitaire: tarif.prixUnitaire, tauxTVA: tarif.tauxTva });

  return { decisionId, dateDebut, dateFin, nbSeances, seancesParSemaine, dateEdition, prestation, tarif, amounts };
}

facturesRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = await parseFactureBody(body, c.env.DB);
  const anneeFacture =
    body.anneeFacture != null
      ? requireInt(body.anneeFacture, "anneeFacture")
      : new Date(parsed.dateEdition).getUTCFullYear();
  const numero = body.numero != null ? requireInt(body.numero, "numero") : await nextNumeroFacture(c.env.DB, anneeFacture);

  const row = await c.env.DB.prepare(
    `INSERT INTO factures
       (numero, annee_facture, decision_id, date_debut, date_fin, nb_seances, seances_par_semaine, prestation,
        prix_unitaire, taux_tva, montant_ttc, montant_ht, montant_tva, date_edition)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(
      numero,
      anneeFacture,
      parsed.decisionId,
      parsed.dateDebut,
      parsed.dateFin,
      parsed.nbSeances,
      parsed.seancesParSemaine,
      parsed.prestation,
      parsed.tarif.prixUnitaire,
      parsed.tarif.tauxTva,
      parsed.amounts.montantTTC,
      parsed.amounts.montantHT,
      parsed.amounts.montantTVA,
      parsed.dateEdition,
    )
    .first<FactureRow>();

  return c.json(mapFacture(row!), 201);
});

facturesRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first<FactureRow>();
  if (!existing) notFound("Facture introuvable");
  if (existing!.bordereau_id != null) {
    conflict("Cette facture a déjà été transmise dans un bordereau et ne peut plus être modifiée");
  }

  const body = await c.req.json();
  const parsed = await parseFactureBody(body, c.env.DB);

  const row = await c.env.DB.prepare(
    `UPDATE factures SET
       decision_id = ?, date_debut = ?, date_fin = ?, nb_seances = ?, seances_par_semaine = ?, prestation = ?,
       prix_unitaire = ?, taux_tva = ?, montant_ttc = ?, montant_ht = ?, montant_tva = ?, date_edition = ?
     WHERE id = ?
     RETURNING *`,
  )
    .bind(
      parsed.decisionId,
      parsed.dateDebut,
      parsed.dateFin,
      parsed.nbSeances,
      parsed.seancesParSemaine,
      parsed.prestation,
      parsed.tarif.prixUnitaire,
      parsed.tarif.tauxTva,
      parsed.amounts.montantTTC,
      parsed.amounts.montantHT,
      parsed.amounts.montantTVA,
      parsed.dateEdition,
      id,
    )
    .first<FactureRow>();

  return c.json(mapFacture(row!));
});

facturesRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await c.env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first<FactureRow>();
  if (!existing) notFound("Facture introuvable");
  if (existing!.bordereau_id != null) {
    conflict("Cette facture a déjà été transmise dans un bordereau et ne peut plus être supprimée");
  }

  await c.env.DB.prepare("DELETE FROM factures WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
