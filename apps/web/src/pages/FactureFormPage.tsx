import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { computeInvoiceAmounts } from "@kine/cnam-format";
import { computeSeanceDates } from "@kine/scheduling";
import { decisionsApi, facturesApi, parametresApi, patientsApi, ApiError } from "@/lib/api.js";
import type { Decision, Patient } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { ErrorBanner } from "@/components/error-banner.js";
import { PatientPicker } from "@/components/patient-picker.js";
import { DecisionFormDialog } from "@/components/decision-form-dialog.js";
import { formatMontant, todayIso } from "@/lib/utils.js";

export function FactureFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [decisionId, setDecisionId] = useState<number | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [nbSeances, setNbSeances] = useState(12);
  const [seancesParSemaine, setSeancesParSemaine] = useState<2 | 3 | 4>(3);
  const [dateEdition, setDateEdition] = useState(todayIso());
  const [prestation, setPrestation] = useState("75");

  const [tarif, setTarif] = useState<{ prixUnitaire: number; tauxTva: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transmise, setTransmise] = useState(false);

  // Chargement initial : mode édition, ou pré-sélection d'une décision via ?decisionId=
  useEffect(() => {
    async function init() {
      if (isEdit && id) {
        const facture = await facturesApi.get(Number(id));
        setTransmise(facture.bordereauId != null);
        const decision = await decisionsApi.get(facture.decisionId);
        const p = await patientsApi.get(decision.patientId);
        setPatient(p);
        setDecisions(await decisionsApi.listForPatient(p.id));
        setDecisionId(decision.id);
        setDateDebut(facture.dateDebut);
        setDateFin(facture.dateFin);
        setNbSeances(facture.nbSeances);
        setSeancesParSemaine(facture.seancesParSemaine);
        setDateEdition(facture.dateEdition);
        setPrestation(facture.prestation);
        return;
      }
      const decisionIdParam = searchParams.get("decisionId");
      if (decisionIdParam) {
        const decision = await decisionsApi.get(Number(decisionIdParam));
        const p = await patientsApi.get(decision.patientId);
        setPatient(p);
        setDecisions(await decisionsApi.listForPatient(p.id));
        setDecisionId(decision.id);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (patient && !isEdit) {
      decisionsApi.listForPatient(patient.id).then(setDecisions);
    }
  }, [patient, isEdit]);

  useEffect(() => {
    parametresApi
      .tarifActuel(dateEdition)
      .then(setTarif)
      .catch(() => setTarif(null));
  }, [dateEdition]);

  const preview =
    tarif && nbSeances > 0
      ? computeInvoiceAmounts({ nbSeances, prixUnitaire: tarif.prixUnitaire, tauxTVA: tarif.tauxTva })
      : null;

  const seancesPreview =
    dateDebut && nbSeances > 0
      ? (() => {
          try {
            return computeSeanceDates({ dateDebut, nbSeances, seancesParSemaine });
          } catch {
            return null;
          }
        })()
      : null;

  useEffect(() => {
    if (seancesPreview && seancesPreview.length > 0 && !isEdit) {
      setDateFin(seancesPreview[seancesPreview.length - 1].date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateDebut, nbSeances, seancesParSemaine]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!decisionId) {
      setError("Sélectionnez ou créez une décision CNAM");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        decisionId,
        dateDebut,
        dateFin,
        nbSeances,
        seancesParSemaine,
        dateEdition,
        prestation,
      };
      if (isEdit && id) {
        await facturesApi.update(Number(id), payload);
      } else {
        await facturesApi.create(payload);
      }
      navigate(patient ? `/patients/${patient.id}` : "/factures");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link to="/factures" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux factures
      </Link>

      <h1 className="text-2xl font-semibold">{isEdit ? "Modifier la facture" : "Nouvelle facture"}</h1>

      {transmise && (
        <ErrorBanner message="Cette facture a déjà été transmise dans un bordereau et ne peut plus être modifiée." />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Patient et décision CNAM</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!isEdit && (
              <Field label="Patient" htmlFor="patient">
                <PatientPicker selected={patient} onSelect={(p) => {
                  setPatient(p);
                  setDecisionId(null);
                }} />
              </Field>
            )}
            {patient && (
              <Field label="Décision de prise en charge" htmlFor="decision">
                <div className="flex gap-2">
                  <Select
                    value={decisionId ? String(decisionId) : undefined}
                    onValueChange={(v) => setDecisionId(Number(v))}
                    disabled={isEdit}
                  >
                    <SelectTrigger id="decision">
                      <SelectValue placeholder="Choisir une décision" />
                    </SelectTrigger>
                    <SelectContent>
                      {decisions.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.bureau}/{d.annee}/{d.numeroOrdre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isEdit && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setDecisionDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Séances</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Date de début" htmlFor="dateDebut">
              <Input id="dateDebut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </Field>
            <Field label="Date de fin" htmlFor="dateFin" hint="Calculée automatiquement, modifiable">
              <Input id="dateFin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required />
            </Field>
            <Field label="Nombre de séances" htmlFor="nbSeances">
              <Input
                id="nbSeances"
                type="number"
                min={1}
                value={nbSeances}
                onChange={(e) => setNbSeances(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Séances / semaine" htmlFor="rythme">
              <Select value={String(seancesParSemaine)} onValueChange={(v) => setSeancesParSemaine(Number(v) as 2 | 3 | 4)}>
                <SelectTrigger id="rythme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 séances/semaine</SelectItem>
                  <SelectItem value="3">3 séances/semaine</SelectItem>
                  <SelectItem value="4">4 séances/semaine</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date d'édition" htmlFor="dateEdition">
              <Input id="dateEdition" type="date" value={dateEdition} onChange={(e) => setDateEdition(e.target.value)} required />
            </Field>
            <Field label="Code prestation" htmlFor="prestation">
              <Input id="prestation" value={prestation} onChange={(e) => setPrestation(e.target.value)} required />
            </Field>
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Montants (aperçu)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Prix unitaire</p>
                <p className="font-medium">{formatMontant(tarif!.prixUnitaire)} DT</p>
              </div>
              <div>
                <p className="text-muted-foreground">HT</p>
                <p className="font-medium">{formatMontant(preview.montantHT)} DT</p>
              </div>
              <div>
                <p className="text-muted-foreground">TVA ({tarif!.tauxTva}%)</p>
                <p className="font-medium">{formatMontant(preview.montantTVA)} DT</p>
              </div>
              <div>
                <p className="text-muted-foreground">TTC</p>
                <p className="font-medium">{formatMontant(preview.montantTTC)} DT</p>
              </div>
            </CardContent>
          </Card>
        )}

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || transmise}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>

      {patient && (
        <DecisionFormDialog
          open={decisionDialogOpen}
          onOpenChange={setDecisionDialogOpen}
          patientId={patient.id}
          onSaved={(newDecisionId) => {
            setDecisionDialogOpen(false);
            decisionsApi.listForPatient(patient.id).then(setDecisions);
            setDecisionId(newDecisionId);
          }}
        />
      )}
    </div>
  );
}
