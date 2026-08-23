export interface DecisionCnam {
  /** Bureau CNAM ayant émis la décision, 2 chiffres (ex: "40", "21"). */
  bureau: string;
  /** Année de la décision de prise en charge. */
  annee: number;
  /** N° d'ordre de la décision (ex: 10836 pour la décision "40/2025/10836"). */
  ordre: number;
}

export interface AssureCnam {
  /** Racine du n° d'assuré CNAM, sans padding (ex: "9875710"). */
  racine: string;
  /** Clé du n° d'assuré CNAM, sans padding (ex: "0", "80"). */
  cle: string;
}

export interface PraticienCnam {
  /** Code CNAM du praticien, sans padding (ex: "29875"). */
  code: string;
  /** Clé CNAM du praticien (ex: "96"). */
  cle: string;
}

/** Rythme de séances par semaine — saisi explicitement par l'utilisateur, jamais recalculé. */
export type SeancesParSemaine = 2 | 3 | 4;

export interface FactureCnamSource {
  /** N° de la facture. */
  numero: number;
  /** Année de la facture. */
  anneeFacture: number;
  decision: DecisionCnam;
  assure: AssureCnam;
  seancesParSemaine: SeancesParSemaine;
  /** Nombre de séances couvertes par la facture. */
  nbSeances: number;
  /** Date de début des séances, ISO "AAAA-MM-JJ". */
  dateDebut: string;
  /** Date de fin des séances, ISO "AAAA-MM-JJ". */
  dateFin: string;
  /** Taux de TVA en %, ex: 7. Le format fichier ne supporte qu'un seul chiffre (0-9). */
  tauxTVA: number;
  /** Montant TTC de la facture, en DT (déjà calculé et historisé — jamais recalculé ici). */
  montantTTC: number;
  /** Montant HT de la facture, en DT. */
  montantHT: number;
  /** Montant de la TVA de la facture, en DT. */
  montantTVA: number;
  /** Date d'édition de la facture, ISO "AAAA-MM-JJ". */
  dateEdition: string;
  /** Code prestation CNAM. Kinésithérapie = "75" (valeur par défaut). */
  prestation?: string;
}

export interface BordereauCnamSource {
  /** Année d'exercice du bordereau. */
  annee: number;
  /** N° du bordereau (ex: 17 pour "017/2024"). */
  numero: number;
  praticien: PraticienCnam;
  factures: FactureCnamSource[];
}

export type LineEnding = "\n" | "\r\n";
