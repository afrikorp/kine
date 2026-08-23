import { Hono } from "hono";
import { encodeBordereauFile } from "@kine/cnam-format";
import { montantEnLettres } from "@kine/shared";
import type { AppEnv } from "../types.js";
import type { BordereauRow, FactureRow } from "../db/schema.js";
import { buildBordereauCnamSource, mapFacture } from "../db/queries.js";
import { badRequest, conflict, notFound, requireInt } from "../lib/http.js";

export const bordereauxRoutes = new Hono<AppEnv>();

function totals(factures: FactureRow[]) {
  return factures.reduce(
    (acc, f) => ({
      totalHt: acc.totalHt + f.montant_ht,
      totalTva: acc.totalTva + f.montant_tva,
      totalTtc: acc.totalTtc + f.montant_ttc,
    }),
    { totalHt: 0, totalTva: 0, totalTtc: 0 },
  );
}

bordereauxRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM bordereaux ORDER BY annee DESC, numero DESC").all<
    BordereauRow
  >();

  const withTotals = await Promise.all(
    results.map(async (b) => {
      const { results: factures } = await c.env.DB.prepare("SELECT * FROM factures WHERE bordereau_id = ?")
        .bind(b.id)
        .all<FactureRow>();
      return {
        id: b.id,
        numero: b.numero,
        annee: b.annee,
        dateCreation: b.date_creation,
        nbFactures: factures.length,
        ...totals(factures),
      };
    }),
  );

  return c.json(withTotals);
});

bordereauxRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const bordereau = await c.env.DB.prepare("SELECT * FROM bordereaux WHERE id = ?").bind(id).first<BordereauRow>();
  if (!bordereau) notFound("Bordereau introuvable");

  const { results: factureRows } = await c.env.DB.prepare(
    `SELECT f.*, p.nom as patient_nom, p.prenom as patient_prenom, d.bureau, d.annee as decision_annee, d.numero_ordre
     FROM factures f
     JOIN decisions_cnam d ON d.id = f.decision_id
     JOIN patients p ON p.id = d.patient_id
     WHERE f.bordereau_id = ?
     ORDER BY f.numero ASC`,
  )
    .bind(id)
    .all<FactureRow & { patient_nom: string; patient_prenom: string; bureau: string; decision_annee: number; numero_ordre: number }>();

  const t = totals(factureRows);

  return c.json({
    id: bordereau!.id,
    numero: bordereau!.numero,
    annee: bordereau!.annee,
    dateCreation: bordereau!.date_creation,
    factures: factureRows.map((row) => ({
      ...mapFacture(row),
      patientNom: row.patient_nom,
      patientPrenom: row.patient_prenom,
      decisionBureau: row.bureau,
      decisionAnnee: row.decision_annee,
      decisionNumeroOrdre: row.numero_ordre,
    })),
    ...t,
    totalTtcEnLettres: montantEnLettres(t.totalTtc),
  });
});

bordereauxRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const numero = requireInt(body.numero, "numero");
  const annee = requireInt(body.annee, "annee");
  const factureIds: unknown = body.factureIds;
  if (!Array.isArray(factureIds) || factureIds.length === 0) {
    badRequest("factureIds doit être un tableau non vide");
  }
  const ids = (factureIds as unknown[]).map((v, i) => requireInt(v, `factureIds[${i}]`));

  const existingBordereau = await c.env.DB.prepare("SELECT id FROM bordereaux WHERE numero = ? AND annee = ?")
    .bind(numero, annee)
    .first();
  if (existingBordereau) conflict(`Le bordereau ${numero}/${annee} existe déjà`);

  const placeholders = ids.map(() => "?").join(", ");
  const { results: factureRows } = await c.env.DB.prepare(
    `SELECT * FROM factures WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<FactureRow>();

  if (factureRows.length !== ids.length) {
    badRequest("Une ou plusieurs factures sont introuvables");
  }
  const dejaTransmises = factureRows.filter((f) => f.bordereau_id != null);
  if (dejaTransmises.length > 0) {
    conflict(`Facture(s) déjà transmise(s) dans un autre bordereau : ${dejaTransmises.map((f) => f.numero).join(", ")}`);
  }

  const bordereau = await c.env.DB.prepare(
    "INSERT INTO bordereaux (numero, annee) VALUES (?, ?) RETURNING *",
  )
    .bind(numero, annee)
    .first<BordereauRow>();

  await c.env.DB.prepare(`UPDATE factures SET bordereau_id = ? WHERE id IN (${placeholders})`)
    .bind(bordereau!.id, ...ids)
    .run();

  return c.json({ id: bordereau!.id, numero: bordereau!.numero, annee: bordereau!.annee, nbFactures: ids.length }, 201);
});

bordereauxRoutes.get("/:id/cnam-file", async (c) => {
  const id = Number(c.req.param("id"));
  const source = await buildBordereauCnamSource(c.env.DB, id);
  if (!source) notFound("Bordereau introuvable");
  if (source!.factures.length === 0) badRequest("Ce bordereau n'a aucune facture");

  // Fin de ligne non confirmée par la CNAM (cf. @kine/cnam-format/README) :
  // LF par défaut, à ajuster si le premier dépôt réel révèle qu'il faut du CRLF.
  const content = encodeBordereauFile(source!);
  const key = `cnam/${source!.annee}/${String(source!.numero).padStart(3, "0")}.txt`;
  await c.env.FILES.put(key, content);

  const filename = `${String(source!.numero).padStart(3, "0")}_${source!.annee}.txt`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=us-ascii",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
