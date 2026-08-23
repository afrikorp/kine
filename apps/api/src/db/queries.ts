import type { BordereauCnamSource } from "@kine/cnam-format";
import type {
  BordereauRow,
  CabinetRow,
  DecisionCnamRow,
  FactureRow,
  ParametreTarifRow,
  PatientRow,
} from "./schema.js";

export async function getCabinet(db: D1Database): Promise<CabinetRow | null> {
  const row = await db.prepare("SELECT * FROM cabinet WHERE id = 1").first<CabinetRow>();
  return row ?? null;
}

export interface Tarif {
  prixUnitaire: number;
  tauxTva: number;
}

/** Résout le tarif (prix unitaire + taux de TVA) en vigueur à une date donnée. */
export async function resolveTarif(db: D1Database, dateIso: string): Promise<Tarif | null> {
  const row = await db
    .prepare(
      "SELECT prix_unitaire, taux_tva FROM parametres_tarif WHERE date_effet <= ? ORDER BY date_effet DESC LIMIT 1",
    )
    .bind(dateIso)
    .first<ParametreTarifRow>();
  if (!row) return null;
  return { prixUnitaire: row.prix_unitaire, tauxTva: row.taux_tva };
}

interface FactureForCnam extends FactureRow {
  decision_bureau: string;
  decision_annee: number;
  decision_ordre: number;
  assure_racine: string;
  assure_cle: string;
}

/**
 * Construit la structure attendue par @kine/cnam-format à partir des
 * lignes D1 d'un bordereau (jointure factures -> décisions -> patients).
 */
export async function buildBordereauCnamSource(
  db: D1Database,
  bordereauId: number,
): Promise<BordereauCnamSource | null> {
  const bordereau = await db
    .prepare("SELECT * FROM bordereaux WHERE id = ?")
    .bind(bordereauId)
    .first<BordereauRow>();
  if (!bordereau) return null;

  const cabinet = await getCabinet(db);
  if (!cabinet) throw new Error("Le cabinet n'est pas configuré (code/clé CNAM praticien manquants).");

  const { results } = await db
    .prepare(
      `SELECT f.*,
              d.bureau AS decision_bureau, d.annee AS decision_annee, d.numero_ordre AS decision_ordre,
              p.numero_assure_racine AS assure_racine, p.numero_assure_cle AS assure_cle
       FROM factures f
       JOIN decisions_cnam d ON d.id = f.decision_id
       JOIN patients p ON p.id = d.patient_id
       WHERE f.bordereau_id = ?
       ORDER BY f.numero ASC`,
    )
    .bind(bordereauId)
    .all<FactureForCnam>();

  return {
    annee: bordereau.annee,
    numero: bordereau.numero,
    praticien: { code: cabinet.code_cnam_praticien, cle: cabinet.cle_cnam_praticien },
    factures: results.map((f) => ({
      numero: f.numero,
      anneeFacture: f.annee_facture,
      decision: { bureau: f.decision_bureau, annee: f.decision_annee, ordre: f.decision_ordre },
      assure: { racine: f.assure_racine, cle: f.assure_cle },
      seancesParSemaine: f.seances_par_semaine,
      nbSeances: f.nb_seances,
      dateDebut: f.date_debut,
      dateFin: f.date_fin,
      tauxTVA: f.taux_tva,
      montantTTC: f.montant_ttc,
      montantHT: f.montant_ht,
      montantTVA: f.montant_tva,
      dateEdition: f.date_edition,
      prestation: f.prestation,
    })),
  };
}

export function mapPatient(row: PatientRow) {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    numeroAssureRacine: row.numero_assure_racine,
    numeroAssureCle: row.numero_assure_cle,
    qualiteBeneficiaire: row.qualite_beneficiaire,
    telephone: row.telephone,
    adresse: row.adresse,
    dateNaissance: row.date_naissance,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDecision(row: DecisionCnamRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    bureau: row.bureau,
    annee: row.annee,
    numeroOrdre: row.numero_ordre,
    createdAt: row.created_at,
  };
}

export function mapFacture(row: FactureRow) {
  return {
    id: row.id,
    numero: row.numero,
    anneeFacture: row.annee_facture,
    decisionId: row.decision_id,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    nbSeances: row.nb_seances,
    seancesParSemaine: row.seances_par_semaine,
    prestation: row.prestation,
    prixUnitaire: row.prix_unitaire,
    tauxTva: row.taux_tva,
    montantTtc: row.montant_ttc,
    montantHt: row.montant_ht,
    montantTva: row.montant_tva,
    dateEdition: row.date_edition,
    bordereauId: row.bordereau_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCabinet(row: CabinetRow) {
  return {
    nom: row.nom,
    adresse: row.adresse,
    telephone: row.telephone,
    rc: row.rc,
    matriculeFiscal: row.matricule_fiscal,
    rib: row.rib,
    codeCnamPraticien: row.code_cnam_praticien,
    cleCnamPraticien: row.cle_cnam_praticien,
    numeroDecision: row.numero_decision,
    specialite: row.specialite,
    banque: row.banque,
    typePraticien: row.type_praticien,
    codePrestation: row.code_prestation,
    codeEmployeur: row.code_employeur,
    cleEmployeur: row.cle_employeur,
    updatedAt: row.updated_at,
  };
}
