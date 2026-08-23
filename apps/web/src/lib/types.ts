export type QualiteBeneficiaire = "assure" | "conjoint" | "enfant" | "ascendant" | "autre";

export const QUALITES: { value: QualiteBeneficiaire; label: string }[] = [
  { value: "assure", label: "Assuré lui-même" },
  { value: "conjoint", label: "Conjoint" },
  { value: "enfant", label: "Enfant" },
  { value: "ascendant", label: "Ascendant" },
  { value: "autre", label: "Autre" },
];

export interface Patient {
  id: number;
  nom: string;
  prenom: string;
  numeroAssureRacine: string;
  numeroAssureCle: string;
  qualiteBeneficiaire: QualiteBeneficiaire;
  telephone: string;
  adresse: string;
  dateNaissance: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: number;
  patientId: number;
  bureau: string;
  annee: number;
  numeroOrdre: number;
  createdAt: string;
}

export type SeancesParSemaine = 2 | 3 | 4;

export interface Facture {
  id: number;
  numero: number;
  anneeFacture: number;
  decisionId: number;
  dateDebut: string;
  dateFin: string;
  nbSeances: number;
  seancesParSemaine: SeancesParSemaine;
  prestation: string;
  prixUnitaire: number;
  tauxTva: number;
  montantTtc: number;
  montantHt: number;
  montantTva: number;
  dateEdition: string;
  bordereauId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FactureAvecPatient extends Facture {
  patientNom: string;
  patientPrenom: string;
  patientNumeroAssureRacine: string;
  patientNumeroAssureCle: string;
  decisionBureau: string;
  decisionAnnee: number;
  decisionNumeroOrdre: number;
}

export interface BordereauSummary {
  id: number;
  numero: number;
  annee: number;
  dateCreation: string;
  nbFactures: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
}

export interface BordereauDetail {
  id: number;
  numero: number;
  annee: number;
  dateCreation: string;
  factures: FactureAvecPatient[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  totalTtcEnLettres: string;
}

export interface Cabinet {
  nom: string;
  adresse: string;
  telephone: string;
  rc: string;
  matriculeFiscal: string;
  rib: string;
  codeCnamPraticien: string;
  cleCnamPraticien: string;
  updatedAt: string;
}

export interface Tarif {
  id: number;
  prixUnitaire: number;
  tauxTva: number;
  dateEffet: string;
}

export interface JourFerie {
  id: number;
  date: string;
  libelle: string;
}

export interface SeanceDate {
  numero: number;
  date: string;
}
