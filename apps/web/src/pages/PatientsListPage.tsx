import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { patientsApi } from "@/lib/api.js";
import type { Patient } from "@/lib/types.js";
import { QUALITES } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { Badge } from "@/components/ui/badge.js";
import { PatientFormDialog } from "@/components/patient-form-dialog.js";

export function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setPatients(await patientsApi.list(q || undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-muted-foreground">Gestion des dossiers patients</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nouveau patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un patient..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>N° assuré</TableHead>
              <TableHead>Qualité</TableHead>
              <TableHead>Téléphone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun patient
                </TableCell>
              </TableRow>
            )}
            {patients.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell>
                  <Link to={`/patients/${p.id}`} className="font-medium hover:underline">
                    {p.nom} {p.prenom}
                  </Link>
                </TableCell>
                <TableCell>
                  {p.numeroAssureRacine}/{p.numeroAssureCle}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{QUALITES.find((q2) => q2.value === p.qualiteBeneficiaire)?.label}</Badge>
                </TableCell>
                <TableCell>{p.telephone || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false);
          reload();
        }}
      />
    </div>
  );
}
