import type { FactureAvecPatient } from "@/lib/types.js";
import { downloadBlob } from "@/lib/download.js";

export async function exportFacturesToExcel(factures: FactureAvecPatient[], filename = "factures.xlsx") {
  // xlsx (SheetJS) est chargé à la demande, seulement quand un export est déclenché.
  const XLSX = await import("xlsx");

  const rows = factures.map((f) => ({
    "N° facture": f.numero,
    Année: f.anneeFacture,
    Patient: `${f.patientNom} ${f.patientPrenom}`,
    "N° décision": `${f.decisionBureau}/${f.decisionAnnee}/${f.decisionNumeroOrdre}`,
    "Date début": f.dateDebut,
    "Date fin": f.dateFin,
    "Nb séances": f.nbSeances,
    "Séances/semaine": f.seancesParSemaine,
    "Prix unitaire": f.prixUnitaire,
    "Montant HT": f.montantHt,
    "Taux TVA (%)": f.tauxTva,
    "Montant TVA": f.montantTva,
    "Montant TTC": f.montantTtc,
    "Date édition": f.dateEdition,
    Bordereau: f.bordereauId ?? "Non transmise",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Factures");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
