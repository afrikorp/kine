import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Download } from "lucide-react";
import { bordereauxApi, cabinetApi, ApiError } from "@/lib/api.js";
import type { BordereauDetail } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { formatDate, formatMontant } from "@/lib/utils.js";
import { generateBordereauPdf } from "@/lib/pdf/bordereau-pdf.js";
import { downloadBytes, downloadBlob } from "@/lib/download.js";

export function BordereauDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bordereauId = Number(id);
  const [bordereau, setBordereau] = useState<BordereauDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    bordereauxApi.get(bordereauId).then(setBordereau);
  }, [bordereauId]);

  async function handlePdf() {
    setBusy("pdf");
    try {
      const cabinet = await cabinetApi.get();
      if (!cabinet) throw new Error("Le cabinet n'est pas configuré — renseignez-le dans Paramètres.");
      const bytes = await generateBordereauPdf({ cabinet, bordereau: bordereau! });
      downloadBytes(bytes, `bordereau-${bordereau!.numero}-${bordereau!.annee}.pdf`, "application/pdf");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la génération du PDF");
    } finally {
      setBusy(null);
    }
  }

  async function handleCnamFile() {
    setBusy("cnam");
    try {
      const { blob, filename } = await bordereauxApi.downloadCnamFile(bordereauId);
      downloadBlob(blob, filename);
    } catch (err) {
      alert(err instanceof ApiError || err instanceof Error ? err.message : "Erreur lors de la génération du fichier");
    } finally {
      setBusy(null);
    }
  }

  if (!bordereau) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/bordereaux" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux bordereaux
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Bordereau {String(bordereau.numero).padStart(3, "0")}/{bordereau.annee}
          </h1>
          <p className="text-muted-foreground">{bordereau.factures.length} facture(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy === "pdf"} onClick={handlePdf}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button disabled={busy === "cnam"} onClick={handleCnamFile}>
            <Download className="h-4 w-4" /> Fichier CNAM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">TOT.HT</p>
            <p className="text-lg font-semibold">{formatMontant(bordereau.totalHt)} DT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">MNT.TVA</p>
            <p className="text-lg font-semibold">{formatMontant(bordereau.totalTva)} DT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">TOT.TTC</p>
            <p className="text-lg font-semibold">{formatMontant(bordereau.totalTtc)} DT</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm italic text-muted-foreground">Arrêté à la somme de : {bordereau.totalTtcEnLettres}</p>

      <Card>
        <CardHeader>
          <CardTitle>Détail des factures</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>N° assuré</TableHead>
                <TableHead>N° décision</TableHead>
                <TableHead>N° facture</TableHead>
                <TableHead>Séances</TableHead>
                <TableHead>TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bordereau.factures.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    {f.patientNom} {f.patientPrenom}
                  </TableCell>
                  <TableCell>
                    {f.patientNumeroAssureRacine}/{f.patientNumeroAssureCle}
                  </TableCell>
                  <TableCell>
                    {f.decisionBureau}/{f.decisionAnnee}/{f.decisionNumeroOrdre}
                  </TableCell>
                  <TableCell>
                    {f.numero}/{f.anneeFacture}
                  </TableCell>
                  <TableCell>
                    {f.nbSeances} ({formatDate(f.dateDebut)} → {formatDate(f.dateFin)})
                  </TableCell>
                  <TableCell>{formatMontant(f.montantTtc)} DT</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
