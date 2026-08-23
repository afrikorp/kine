import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { bordereauxApi } from "@/lib/api.js";
import type { BordereauSummary } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { NewBordereauDialog } from "@/components/new-bordereau-dialog.js";
import { formatDate, formatMontant } from "@/lib/utils.js";

export function BordereauxListPage() {
  const [bordereaux, setBordereaux] = useState<BordereauSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  function reload() {
    bordereauxApi.list().then(setBordereaux);
  }

  useEffect(reload, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bordereaux de transmission</h1>
          <p className="text-muted-foreground">Regroupement des factures pour transmission à la CNAM</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nouveau bordereau
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° bordereau</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Factures</TableHead>
              <TableHead>Total TTC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bordereaux.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun bordereau
                </TableCell>
              </TableRow>
            )}
            {bordereaux.map((b) => (
              <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/bordereaux/${b.id}`)}>
                <TableCell className="font-medium">
                  <Link to={`/bordereaux/${b.id}`} className="hover:underline">
                    {String(b.numero).padStart(3, "0")}/{b.annee}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(b.dateCreation.slice(0, 10))}</TableCell>
                <TableCell>{b.nbFactures}</TableCell>
                <TableCell>{formatMontant(b.totalTtc)} DT</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NewBordereauDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(id) => {
          setDialogOpen(false);
          navigate(`/bordereaux/${id}`);
        }}
      />
    </div>
  );
}
