const SMALL = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const TENS_20_60: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
};

function twoDigitWords(n: number): string {
  if (n < 20) return SMALL[n];
  if (n < 70) {
    const tensWord = TENS_20_60[Math.floor(n / 10)];
    const unit = n % 10;
    if (unit === 0) return tensWord;
    if (unit === 1) return `${tensWord} et un`;
    return `${tensWord}-${SMALL[unit]}`;
  }
  if (n < 80) {
    const rem = n - 60; // 10..19
    if (rem === 11) return "soixante et onze";
    return `soixante-${SMALL[rem]}`;
  }
  // 80..99
  if (n === 80) return "quatre-vingts";
  const rem = n - 80; // 1..19
  return `quatre-vingt-${SMALL[rem]}`;
}

function threeDigitWords(n: number): string {
  if (n < 100) return twoDigitWords(n);
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let base = h === 1 ? "cent" : `${SMALL[h]} cent`;
  if (rem === 0) {
    if (h > 1) base += "s";
    return base;
  }
  return `${base} ${twoDigitWords(rem)}`;
}

/** Nombre entier positif ou nul en toutes lettres (français). */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`numberToWords: attendu un entier positif, reçu ${n}`);
  }
  if (n === 0) return "zéro";

  const billions = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (billions > 0) {
    parts.push(`${billions === 1 ? "un" : threeDigitWords(billions)} milliard${billions > 1 ? "s" : ""}`);
  }
  if (millions > 0) {
    parts.push(`${millions === 1 ? "un" : threeDigitWords(millions)} million${millions > 1 ? "s" : ""}`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "mille" : `${threeDigitWords(thousands)} mille`);
  }
  if (rest > 0 || parts.length === 0) {
    parts.push(threeDigitWords(rest));
  }

  return parts.join(" ");
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

export interface MontantEnLettresOptions {
  /** Nom de l'unité principale (singulier). Défaut : "dinar". */
  unite?: string;
  /** Nom de la sous-unité (singulier), ex "millime" pour le dinar tunisien. Défaut : "millime". */
  sousUnite?: string;
  /** Nombre de sous-unités par unité (1000 millimes = 1 dinar). Défaut : 1000. */
  diviseur?: number;
  capitalize?: boolean;
}

/**
 * Montant en toutes lettres, ex : 138.972 -> "Cent trente-huit dinars neuf
 * cent soixante-douze millimes" (dinar tunisien = 3 décimales = millimes).
 */
export function montantEnLettres(amount: number, options: MontantEnLettresOptions = {}): string {
  const {
    unite = "dinar",
    sousUnite = "millime",
    diviseur = 1000,
    capitalize: shouldCapitalize = true,
  } = options;

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`montantEnLettres: attendu un montant positif, reçu ${amount}`);
  }

  let unitePart = Math.floor(amount);
  let sousUnitePart = Math.round((amount - unitePart) * diviseur);
  if (sousUnitePart >= diviseur) {
    unitePart += 1;
    sousUnitePart -= diviseur;
  }

  const uniteWord = unitePart > 1 ? `${unite}s` : unite;
  const uniteText = `${numberToWords(unitePart)} ${uniteWord}`;

  const result =
    sousUnitePart === 0
      ? uniteText
      : `${uniteText} ${numberToWords(sousUnitePart)} ${sousUnitePart > 1 ? `${sousUnite}s` : sousUnite}`;

  return shouldCapitalize ? capitalize(result) : result;
}
