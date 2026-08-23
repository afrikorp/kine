import { addDays, formatIso, isSunday, parseIso } from "./dates.js";

export type SeancesParSemaine = 2 | 3 | 4;

export interface ComputeSeanceDatesInput {
  dateDebut: string; // ISO "AAAA-MM-JJ"
  nbSeances: number;
  seancesParSemaine: SeancesParSemaine;
  /** Dates ISO des jours fériés (paramétrables), en plus des dimanches. */
  joursFeries?: string[];
}

export interface SeanceDate {
  numero: number; // 1-based
  date: string; // ISO "AAAA-MM-JJ"
}

/**
 * Cycle d'écarts (en jours) entre séances consécutives, choisi pour
 * reproduire au mieux le rythme demandé (somme du cycle = 7 jours = 1
 * semaine). Déduit empiriquement des 81 factures réelles utilisées comme
 * fixtures dans @kine/cnam-format (dateDébut/dateFin/nb_séances/rythme) :
 *
 * - 2/semaine : [3, 4] — confirmé sur 100% des factures à ce rythme (3/3).
 * - 3/semaine : [2, 2, 3] — confirmé sur 76% des factures à ce rythme
 *   (56/74) ; les 18 restantes tombent 1 jour plus tôt que prévu, écart
 *   probablement dû à un jour férié (mobile, ex. Aïd) non listé pour
 *   2024/2025 dans l'échantillon — à corriger en renseignant ce jour dans
 *   les paramètres.
 * - 4/semaine : [1, 1, 1, 4] — échantillon trop petit (4 factures, 2/4
 *   exactes) pour être confirmé ; à vérifier avec le logiciel existant
 *   avant de s'y fier pour un patient réel à ce rythme.
 *
 * Voir packages/scheduling/test/compute-seance-dates.test.ts.
 */
const GAP_PATTERNS: Record<SeancesParSemaine, number[]> = {
  2: [3, 4],
  3: [2, 2, 3],
  4: [1, 1, 1, 4],
};

/**
 * Calcule les dates des séances d'une facture pour le "mémoire des
 * séances" : `nbSeances` dates à partir de `dateDebut`, espacées selon le
 * rythme demandé, en excluant les dimanches et les jours fériés fournis.
 */
export function computeSeanceDates(input: ComputeSeanceDatesInput): SeanceDate[] {
  if (!Number.isInteger(input.nbSeances) || input.nbSeances <= 0) {
    throw new Error(`nbSeances doit être un entier positif, reçu ${input.nbSeances}`);
  }
  const gaps = GAP_PATTERNS[input.seancesParSemaine];
  if (!gaps) {
    throw new Error(`seancesParSemaine invalide : ${input.seancesParSemaine} (attendu 2, 3 ou 4)`);
  }
  const holidays = new Set(input.joursFeries ?? []);

  let cur = parseIso(input.dateDebut);
  while (isSunday(cur) || holidays.has(formatIso(cur))) {
    cur = addDays(cur, 1);
  }
  const dates: SeanceDate[] = [{ numero: 1, date: formatIso(cur) }];

  let gapIndex = 0;
  for (let i = 1; i < input.nbSeances; i++) {
    cur = addDays(cur, gaps[gapIndex % gaps.length]);
    while (isSunday(cur) || holidays.has(formatIso(cur))) {
      cur = addDays(cur, 1);
    }
    dates.push({ numero: i + 1, date: formatIso(cur) });
    gapIndex++;
  }

  return dates;
}
