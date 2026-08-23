export interface InvoiceAmountsInput {
  nbSeances: number;
  /** Prix unitaire en vigueur à la date de la facture (paramètre historisé). */
  prixUnitaire: number;
  /** Taux de TVA en vigueur à la date de la facture (paramètre historisé), en %. */
  tauxTVA: number;
}

export interface InvoiceAmounts {
  montantTTC: number;
  montantHT: number;
  montantTVA: number;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * TTC = nb_séances × Prix_Unitaire
 * HT  = round(TTC / (1 + taux_TVA/100), 3)
 * TVA = TTC − HT
 *
 * Une fois calculés, ces montants sont stockés sur la facture et ne doivent
 * plus être recalculés si le prix unitaire ou le taux de TVA changent ensuite.
 */
export function computeInvoiceAmounts({ nbSeances, prixUnitaire, tauxTVA }: InvoiceAmountsInput): InvoiceAmounts {
  const montantTTC = round(nbSeances * prixUnitaire, 3);
  const montantHT = round(montantTTC / (1 + tauxTVA / 100), 3);
  const montantTVA = round(montantTTC - montantHT, 3);
  return { montantTTC, montantHT, montantTVA };
}
