import type { BordereauDetail, Cabinet } from "@/lib/types.js";
import { formatMontant } from "@/lib/utils.js";
import { PdfWriter } from "./pdf-writer.js";

export async function generateBordereauPdf({
  cabinet,
  bordereau,
}: {
  cabinet: Cabinet;
  bordereau: BordereauDetail;
}): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.text(cabinet.nom, { size: 16, bold: true, gap: 4 });
  w.text(`Code CNAM praticien : ${cabinet.codeCnamPraticien}/${cabinet.cleCnamPraticien}`, {
    size: 9,
    color: [0.35, 0.35, 0.4],
  });
  w.space(14);
  w.text(`BORDEREAU DE TRANSMISSION N° ${String(bordereau.numero).padStart(3, "0")}/${bordereau.annee}`, {
    size: 14,
    bold: true,
    gap: 4,
  });
  w.text(`${bordereau.factures.length} facture(s)`, { size: 10 });
  w.space(10);
  w.line();

  const cols = [
    { label: "Patient", x: w.margin, width: 130 },
    { label: "N° assuré", x: w.margin + 135, width: 85 },
    { label: "N° décision", x: w.margin + 225, width: 100 },
    { label: "N° facture", x: w.margin + 330, width: 80 },
    { label: "TTC (DT)", x: w.margin + 415, width: 80 },
  ];

  const drawHeader = () => {
    w.row(cols.map((c) => ({ text: c.label, x: c.x, bold: true, size: 9 })));
    w.line();
  };

  drawHeader();

  for (const f of bordereau.factures) {
    const newPage = w.ensureSpace(60);
    if (newPage) drawHeader();
    w.row([
      { text: `${f.patientNom} ${f.patientPrenom}`, x: cols[0].x, size: 9 },
      { text: `${f.patientNumeroAssureRacine}/${f.patientNumeroAssureCle}`, x: cols[1].x, size: 9 },
      { text: `${f.decisionBureau}/${f.decisionAnnee}/${f.decisionNumeroOrdre}`, x: cols[2].x, size: 9 },
      { text: `${f.numero}/${f.anneeFacture}`, x: cols[3].x, size: 9 },
      { text: formatMontant(f.montantTtc), x: cols[4].x, size: 9 },
    ]);
  }

  w.ensureSpace(120);
  w.line();
  w.space(4);
  w.row([{ text: `TOT.HT : ${formatMontant(bordereau.totalHt)} DT`, x: w.margin, bold: true }]);
  w.row([{ text: `MNT.TVA : ${formatMontant(bordereau.totalTva)} DT`, x: w.margin, bold: true }]);
  w.row([{ text: `TOT.TTC : ${formatMontant(bordereau.totalTtc)} DT`, x: w.margin, bold: true }]);
  w.space(6);
  w.text(`Arrêté le présent bordereau à la somme de : ${bordereau.totalTtcEnLettres}.`, { size: 10, bold: true });

  return w.save();
}
