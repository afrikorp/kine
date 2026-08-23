/**
 * Types miroir des tables D1 définies dans apps/api/migrations/0001_init.sql.
 * Une ligne par table, champs en snake_case (nom exact des colonnes) —
 * le mapping vers des DTO camelCase se fait dans la couche API (étape 4).
 */

export interface CabinetRow {
  id: 1;
  nom: string;
  adresse: string;
  telephone: string;
  rc: string;
  matricule_fiscal: string;
  rib: string;
  code_cnam_praticien: string;
  cle_cnam_praticien: string;
  numero_decision: string;
  specialite: string;
  banque: string;
  type_praticien: string;
  code_prestation: string;
  code_employeur: string;
  cle_employeur: string;
  updated_at: string;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface ParametreTarifRow {
  id: number;
  prix_unitaire: number;
  taux_tva: number;
  date_effet: string;
  created_at: string;
}

export interface JourFerieRow {
  id: number;
  date: string;
  libelle: string;
}

export type QualiteBeneficiaire = "assure" | "conjoint" | "enfant" | "ascendant" | "autre";

export interface PatientRow {
  id: number;
  nom: string;
  prenom: string;
  numero_assure_racine: string;
  numero_assure_cle: string;
  qualite_beneficiaire: QualiteBeneficiaire;
  telephone: string;
  adresse: string;
  date_naissance: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionCnamRow {
  id: number;
  patient_id: number;
  bureau: string;
  annee: number;
  numero_ordre: number;
  created_at: string;
}

export interface BordereauRow {
  id: number;
  numero: number;
  annee: number;
  date_creation: string;
  created_at: string;
}

export type SeancesParSemaine = 2 | 3 | 4;

export interface FactureRow {
  id: number;
  numero: number;
  annee_facture: number;
  decision_id: number;
  date_debut: string;
  date_fin: string;
  nb_seances: number;
  seances_par_semaine: SeancesParSemaine;
  prestation: string;
  prix_unitaire: number;
  taux_tva: number;
  montant_ttc: number;
  montant_ht: number;
  montant_tva: number;
  date_edition: string;
  bordereau_id: number | null;
  created_at: string;
  updated_at: string;
}
