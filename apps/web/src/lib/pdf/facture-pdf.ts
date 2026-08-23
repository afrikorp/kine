import { montantEnLettres } from "@kine/shared";
import type { Cabinet, Facture, Patient, Decision } from "@/lib/types.js";
import { QUALITES } from "@/lib/types.js";
import { formatDate, formatMontant } from "@/lib/utils.js";
import { PdfWriter } from "./pdf-writer.js";

export async function generateFacturePdf({
  cabinet,
  patient,
  decision,
  facture,
}: {
  cabinet: Cabinet;
  patient: Patient;
  decision: Decision;
  facture: Facture;
}): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.text(cabinet.nom, { size: 16, bold: true, gap: 4 });
  w.text(cabinet.adresse, { size: 9, color: [0.35, 0.35, 0.4] });
  w.text(`Tél : ${cabinet.telephone}`, { size: 9, color: [0.35, 0.35, 0.4] });
  w.text(`RC : ${cabinet.rc}    Matricule fiscal : ${cabinet.matriculeFiscal}`, { size: 9, color: [0.35, 0.35, 0.4] });
  w.text(`RIB : ${cabinet.rib}`, { size: 9, color: [0.35, 0.35, 0.4], gap: 4 });
  w.text(`Code CNAM praticien : ${cabinet.codeCnamPraticien}/${cabinet.cleCnamPraticien}`, {
    size: 9,
    color: [0.35, 0.35, 0.4],
  });
  w.space(16);
  w.line();
  w.space(6);

  w.text(`FACTURE N° ${facture.numero}/${facture.anneeFacture}`, { size: 14, bold: true, gap: 4 });
  w.text(`Date d'édition : ${formatDate(facture.dateEdition)}`, { size: 10 });
  w.space(10);

  w.row([{ text: "Patient", x: w.margin, bold: true }]);
  w.row([{ text: `${patient.nom} ${patient.prenom}`, x: w.margin }]);
  w.row([{ text: `N° assuré CNAM : ${patient.numeroAssureRacine}/${patient.numeroAssureCle}`, x: w.margin }]);
  w.row([
    {
      text: `Qualité : ${QUALITES.find((q) => q.value === patient.qualiteBeneficiaire)?.label ?? patient.qualiteBeneficiaire}`,
      x: w.margin,
    },
  ]);
  w.space(6);

  w.row([{ text: "Décision de prise en charge CNAM", x: w.margin, bold: true }]);
  w.row([{ text: `N° ${decision.bureau}/${decision.annee}/${decision.numeroOrdre}`, x: w.margin }]);
  w.space(6);

  w.row([{ text: "Séances", x: w.margin, bold: true }]);
  w.row([
    {
      text: `${facture.nbSeances} séances du ${formatDate(facture.dateDebut)} au ${formatDate(facture.dateFin)} — ${facture.seancesParSemaine} séances/semaine`,
      x: w.margin,
    },
  ]);
  w.space(14);

  w.line();
  const col1 = w.margin;
  const col2 = w.margin + 130;
  const col3 = w.margin + 260;
  const col4 = w.margin + 380;
  w.row([
    { text: "Prix unitaire", x: col1, bold: true },
    { text: "Montant HT", x: col2, bold: true },
    { text: `TVA (${facture.tauxTva}%)`, x: col3, bold: true },
    { text: "Montant TTC", x: col4, bold: true },
  ]);
  w.row([
    { text: `${formatMontant(facture.prixUnitaire)} DT`, x: col1 },
    { text: `${formatMontant(facture.montantHt)} DT`, x: col2 },
    { text: `${formatMontant(facture.montantTva)} DT`, x: col3 },
    { text: `${formatMontant(facture.montantTtc)} DT`, x: col4 },
  ]);
  w.line();
  w.space(10);

  w.text(`Arrêtée la présente facture à la somme de : ${montantEnLettres(facture.montantTtc)}.`, {
    size: 10,
    bold: true,
  });

  return w.save();
}
