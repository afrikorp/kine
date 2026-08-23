import type { BordereauCnamSource, FactureCnamSource, LineEnding } from "./types.js";

/**
 * Format fichier électronique CNAM — rétro-ingénié à partir de 3 bordereaux
 * réels (81 lignes de détail + 3 en-têtes), validé par reconstruction
 * byte-for-byte à 100% sur l'échantillon (voir packages/cnam-format/test).
 *
 * Ce format n'est PAS documenté officiellement par la CNAM. Avant tout premier
 * dépôt réel : faire valider un fichier de test par la CNAM, et vérifier en
 * particulier la constante position 8-9 et le champ "séances/semaine".
 */
export const LINE_WIDTH = 135;

const RESERVED_CONSTANT = "01";
const DEFAULT_PRESTATION = "75";

function zeroPadNum(n: number, width: number, fieldName: string): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${fieldName}: attendu un entier positif, reçu ${n}`);
  }
  const s = String(n);
  if (s.length > width) {
    throw new Error(`${fieldName}: la valeur ${n} ne tient pas sur ${width} chiffres`);
  }
  return s.padStart(width, "0");
}

function zeroPadDigits(s: string, width: number, fieldName: string): string {
  if (!/^\d+$/.test(s)) {
    throw new Error(`${fieldName}: attendu des chiffres uniquement, reçu "${s}"`);
  }
  if (s.length > width) {
    throw new Error(`${fieldName}: la valeur "${s}" ne tient pas sur ${width} caractères`);
  }
  return s.padStart(width, "0");
}

function spacePadNum(n: number, width: number, fieldName: string): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${fieldName}: attendu un entier positif, reçu ${n}`);
  }
  const s = String(n);
  if (s.length > width) {
    throw new Error(`${fieldName}: la valeur ${n} ne tient pas sur ${width} caractères`);
  }
  return s.padStart(width, " ");
}

function formatYear(n: number, fieldName: string): string {
  if (!Number.isInteger(n) || n < 1000 || n > 9999) {
    throw new Error(`${fieldName}: attendu une année sur 4 chiffres, reçu ${n}`);
  }
  return String(n);
}

function formatDateCompact(iso: string, fieldName: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    throw new Error(`${fieldName}: attendu une date ISO "AAAA-MM-JJ", reçu "${iso}"`);
  }
  return m[1] + m[2] + m[3];
}

function amountToUnits(amount: number, multiplier: number, width: number, fieldName: string): string {
  const units = Math.round(amount * multiplier);
  return zeroPadNum(units, width, fieldName);
}

export function encodeBordereauHeaderLine(bordereau: BordereauCnamSource): string {
  const nbLignes = bordereau.factures.length;
  const ttcTotalX10 = bordereau.factures.reduce(
    (sum, f) => sum + Math.round(f.montantTTC * 10),
    0,
  );

  const line = [
    "1",
    formatYear(bordereau.annee, "annee bordereau"),
    zeroPadNum(bordereau.numero, 3, "numero bordereau"),
    RESERVED_CONSTANT,
    zeroPadDigits(bordereau.praticien.code, 8, "code praticien"),
    zeroPadDigits(bordereau.praticien.cle, 2, "cle praticien"),
    "0".repeat(49),
    zeroPadNum(nbLignes, 2, "nombre de lignes du bordereau"),
    "0".repeat(19),
    zeroPadNum(ttcTotalX10, 5, "TTC total du bordereau"),
    "0".repeat(40),
  ].join("");

  return line;
}

export function encodeFactureLine(
  bordereau: BordereauCnamSource,
  facture: FactureCnamSource,
): string {
  const line = [
    "2",
    formatYear(bordereau.annee, "annee bordereau"),
    zeroPadNum(bordereau.numero, 3, "numero bordereau"),
    RESERVED_CONSTANT,
    zeroPadDigits(bordereau.praticien.code, 8, "code praticien"),
    zeroPadDigits(bordereau.praticien.cle, 2, "cle praticien"),
    formatYear(bordereau.annee, "annee bordereau (repetee)"),
    spacePadNum(facture.numero, 10, "numero facture"),
    "/",
    formatYear(facture.anneeFacture, "annee facture"),
    zeroPadDigits(facture.decision.bureau, 2, "bureau decision"),
    facture.prestation ?? DEFAULT_PRESTATION,
    formatYear(facture.decision.annee, "annee decision"),
    zeroPadNum(facture.decision.ordre, 6, "ordre decision"),
    zeroPadDigits(facture.assure.racine, 10, "racine assure"),
    zeroPadDigits(facture.assure.cle, 2, "cle assure"),
    "00",
    String(facture.seancesParSemaine),
    "0",
    zeroPadNum(facture.nbSeances, 2, "nombre de seances"),
    formatDateCompact(facture.dateDebut, "date debut"),
    formatDateCompact(facture.dateFin, "date fin"),
    "0000",
    amountToUnits(facture.montantTTC, 10, 4, "montant TTC facture"),
    "000000",
    amountToUnits(facture.montantHT, 1000, 6, "montant HT facture"),
    "000000",
    zeroPadNum(facture.tauxTVA, 1, "taux TVA"),
    "00000000",
    amountToUnits(facture.montantTVA, 1000, 5, "montant TVA facture"),
    formatDateCompact(facture.dateEdition, "date edition"),
  ].join("");

  return line;
}

export function encodeBordereauLines(bordereau: BordereauCnamSource): string[] {
  const lines = [
    encodeBordereauHeaderLine(bordereau),
    ...bordereau.factures.map((f) => encodeFactureLine(bordereau, f)),
  ];
  lines.forEach((line, i) => {
    if (line.length !== LINE_WIDTH) {
      throw new Error(`Ligne ${i} : longueur ${line.length}, attendu ${LINE_WIDTH}`);
    }
  });
  return lines;
}

export function encodeBordereauFile(bordereau: BordereauCnamSource, eol: LineEnding = "\n"): string {
  return encodeBordereauLines(bordereau).join(eol);
}
