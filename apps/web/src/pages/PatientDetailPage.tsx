import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { patientsApi, decisionsApi, facturesApi, ApiError } from "@/lib/api.js";
import type { Decision, FactureAvecPatient, Patient } from "@/lib/types.js";
import { QUALITES } from "@/lib/types.js";
import { Button, buttonVariants } from "@/components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { PatientFormDialog } from "@/components/patient-form-dialog.js";
import { DecisionFormDialog } from "@/components/decision-form-dialog.js";
import { FactureActions } from "@/components/facture-actions.js";
import { formatDate, formatMontant, cn } from "@/lib/utils.js";

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [factures, setFactures] = useState<FactureAvecPatient[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);

  async function reload() {
    const [p, d, f] = await Promise.all([
      patientsApi.get(patientId),
      decisionsApi.listForPatient(patientId),
      facturesApi.list({ patientId }),
    ]);
    setPatient(p);
    setDecisions(d);
    setFactures(f);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleDeleteDecision(decisionId: number) {
    if (!confirm("Supprimer cette décision CNAM ?")) return;
    try {
      await decisionsApi.remove(decisionId);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Suppression impossible");
    }
  }

  if (!patient) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/patients" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux patients
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {patient.nom} {patient.prenom}
          </h1>
          <p className="text-muted-foreground">
            N° assuré {patient.numeroAssureRacine}/{patient.numeroAssureCle} —{" "}
            {QUALITES.find((q) => q.value === patient.qualiteBeneficiaire)?.label}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Téléphone</p>
            <p className="font-medium">{patient.telephone || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Adresse</p>
            <p className="font-medium">{patient.adresse || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Date de naissance</p>
            <p className="font-medium">{formatDate(patient.dateNaissance) || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Décisions de prise en charge CNAM</CardTitle>
          <Button size="sm" onClick={() => setDecisionDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvelle décision
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° décision</TableHead>
                <TableHead>Factures liées</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucune décision
                  </TableCell>
                </TableRow>
              )}
              {decisions.map((d) => {
                const nbFactures = factures.filter((f) => f.decisionId === d.id).length;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.bureau}/{d.annee}/{d.numeroOrdre}
                    </TableCell>
                    <TableCell>{nbFactures}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Link
                        to={`/factures/nouvelle?decisionId=${d.id}`}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        Nouvelle facture
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={nbFactures > 0}
                        title={nbFactures > 0 ? "Des factures y sont liées" : "Supprimer"}
                        onClick={() => handleDeleteDecision(d.id)}
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° facture</TableHead>
                <TableHead>Séances</TableHead>
                <TableHead>TTC</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {factures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                    {f.nbSeances} ({formatDate(f.dateDebut)} → {formatDate(f.dateFin)})
                  </TableCell>
                  <TableCell>{formatMontant(f.montantTtc)} DT</TableCell>
                  <TableCell>
                    <FactureActions facture={f} onDeleted={reload} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSaved={() => {
          setEditOpen(false);
          reload();
        }}
      />
      <DecisionFormDialog
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
        patientId={patientId}
        onSaved={() => {
          setDecisionDialogOpen(false);
          reload();
        }}
      />
    </div>
  );
}
