import type { Cabinet, Facture, Patient, SeanceDate } from "@/lib/types.js";
import { formatDate } from "@/lib/utils.js";
import { PdfWriter } from "./pdf-writer.js";

export async function generateMemoireSeancesPdf({
  cabinet,
  patient,
  facture,
  dates,
}: {
  cabinet: Cabinet;
  patient: Patient;
  facture: Facture;
  dates: SeanceDate[];
}): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.text(cabinet.nom, { size: 16, bold: true, gap: 4 });
  w.space(10);
  w.text("MÉMOIRE DES SÉANCES", { size: 14, bold: true, gap: 4 });
  w.text(`Patient : ${patient.nom} ${patient.prenom}`, { size: 10 });
  w.text(`Facture n° ${facture.numero}/${facture.anneeFacture} — ${facture.nbSeances} séances`, { size: 10 });
  w.space(14);
  w.line();

  const cols = [
    { label: "Séance N°", x: w.margin },
    { label: "Date", x: w.margin + 100 },
    { label: "Signature", x: w.margin + 260 },
  ];
  const drawHeader = () => {
    w.row(cols.map((c) => ({ text: c.label, x: c.x, bold: true, size: 9 })));
    w.line();
  };
  drawHeader();

  for (const d of dates) {
    const newPage = w.ensureSpace(80);
    if (newPage) drawHeader();
    w.row([
      { text: String(d.numero), x: cols[0].x, size: 9 },
      { text: formatDate(d.date), x: cols[1].x, size: 9 },
    ]);
    w.space(6);
  }

  return w.save();
}
