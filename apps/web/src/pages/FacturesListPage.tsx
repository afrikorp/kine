import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, FileSpreadsheet } from "lucide-react";
import { facturesApi } from "@/lib/api.js";
import type { FactureAvecPatient } from "@/lib/types.js";
import { Button, buttonVariants } from "@/components/ui/button.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { Badge } from "@/components/ui/badge.js";
import { Input } from "@/components/ui/input.js";
import { cn, formatDate, formatMontant } from "@/lib/utils.js";
import { FactureActions } from "@/components/facture-actions.js";
import { exportFacturesToExcel } from "@/lib/excel/export-factures.js";

export function FacturesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sansBordereau = searchParams.get("sansBordereau") === "1";
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [factures, setFactures] = useState<FactureAvecPatient[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setFactures(await facturesApi.list(sansBordereau ? { sansBordereau: true } : { annee }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annee, sansBordereau]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Factures</h1>
          <p className="text-muted-foreground">
            {sansBordereau ? "Factures pas encore transmises dans un bordereau" : `Année ${annee}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportFacturesToExcel(factures)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Link to="/factures/nouvelle" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" /> Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {sansBordereau ? (
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({})}>
            Voir toutes les factures
          </Button>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Année :</span>
            <Input
              type="number"
              className="w-28"
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
            />
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° facture</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>N° décision</TableHead>
              <TableHead>Séances</TableHead>
              <TableHead>TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && factures.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucune facture
                </TableCell>
              </TableRow>
            )}
            {factures.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  {f.numero}/{f.anneeFacture}
                </TableCell>
                <TableCell>
                  <Link to={`/patients`} className="hover:underline">
                    {f.patientNom} {f.patientPrenom}
                  </Link>
                </TableCell>
                <TableCell>
                  {f.decisionBureau}/{f.decisionAnnee}/{f.decisionNumeroOrdre}
                </TableCell>
                <TableCell>
                  {f.nbSeances} ({formatDate(f.dateDebut)} → {formatDate(f.dateFin)})
                </TableCell>
                <TableCell>{formatMontant(f.montantTtc)} DT</TableCell>
                <TableCell>
                  {f.bordereauId ? (
                    <Badge variant="secondary">Transmise</Badge>
                  ) : (
                    <Badge variant="outline">À transmettre</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <FactureActions facture={f} onDeleted={reload} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
