import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { computeInvoiceAmounts } from "@kine/cnam-format";
import { computeSeanceDates } from "@kine/scheduling";
import { decisionsApi, facturesApi, parametresApi, patientsApi, ApiError } from "@/lib/api.js";
import type { Decision, JourFerie, Patient, QualiteBeneficiaire } from "@/lib/types.js";
import { QUALITES } from "@/lib/types.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { ErrorBanner } from "@/components/error-banner.js";
import { formatDate, formatMontant, todayIso } from "@/lib/utils.js";

const JOURS_SEMAINE = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function applyPatientDecision(p: Patient, d: Decision, setters: {
  setPatient: (p: Patient) => void;
  setDecision: (d: Decision) => void;
  setNom: (v: string) => void;
  setPrenom: (v: string) => void;
  setRacine: (v: string) => void;
  setCle: (v: string) => void;
  setQualite: (v: QualiteBeneficiaire) => void;
  setBureau: (v: string) => void;
  setAnnee: (v: number) => void;
  setNumeroOrdre: (v: string) => void;
}) {
  setters.setPatient(p);
  setters.setDecision(d);
  setters.setNom(p.nom);
  setters.setPrenom(p.prenom);
  setters.setRacine(p.numeroAssureRacine);
  setters.setCle(p.numeroAssureCle);
  setters.setQualite(p.qualiteBeneficiaire);
  setters.setBureau(d.bureau);
  setters.setAnnee(d.annee);
  setters.setNumeroOrdre(String(d.numeroOrdre));
}

export function FactureFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  // Patient et décision : saisis à chaque facture (pas de sélection dans une
  // liste de patients existants — le nom/prénom peut différer d'une décision
  // à l'autre pour le même bénéficiaire).
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [racine, setRacine] = useState("");
  const [cle, setCle] = useState("");
  const [qualiteBeneficiaire, setQualiteBeneficiaire] = useState<QualiteBeneficiaire>("assure");
  const [bureau, setBureau] = useState("40");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [numeroOrdre, setNumeroOrdre] = useState("");

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [nbSeances, setNbSeances] = useState(12);
  const [seancesParSemaine, setSeancesParSemaine] = useState<2 | 3 | 4>(3);
  const [dateEdition, setDateEdition] = useState(todayIso());
  const [prestation, setPrestation] = useState("75");

  const [tarif, setTarif] = useState<{ prixUnitaire: number; tauxTva: number } | null>(null);
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transmise, setTransmise] = useState(false);

  // Chargement initial : mode édition, ou pré-sélection d'une décision existante via ?decisionId=
  useEffect(() => {
    async function init() {
      if (isEdit && id) {
        const facture = await facturesApi.get(Number(id));
        setTransmise(facture.bordereauId != null);
        const d = await decisionsApi.get(facture.decisionId);
        const p = await patientsApi.get(d.patientId);
        applyPatientDecision(p, d, { setPatient, setDecision, setNom, setPrenom, setRacine, setCle, setQualite: setQualiteBeneficiaire, setBureau, setAnnee, setNumeroOrdre });
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
        const d = await decisionsApi.get(Number(decisionIdParam));
        const p = await patientsApi.get(d.patientId);
        applyPatientDecision(p, d, { setPatient, setDecision, setNom, setPrenom, setRacine, setCle, setQualite: setQualiteBeneficiaire, setBureau, setAnnee, setNumeroOrdre });
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    parametresApi
      .tarifActuel(dateEdition)
      .then(setTarif)
      .catch(() => setTarif(null));
  }, [dateEdition]);

  useEffect(() => {
    parametresApi.listJoursFeries().then(setJoursFeries);
  }, []);

  const readOnlyPatientDecision = isEdit || decision !== null;

  const preview =
    tarif && nbSeances > 0
      ? computeInvoiceAmounts({ nbSeances, prixUnitaire: tarif.prixUnitaire, tauxTVA: tarif.tauxTva })
      : null;

  const seancesPreview =
    dateDebut && nbSeances > 0
      ? (() => {
          try {
            return computeSeanceDates({
              dateDebut,
              nbSeances,
              seancesParSemaine,
              joursFeries: joursFeries.map((j) => j.date),
            });
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
  }, [dateDebut, nbSeances, seancesParSemaine, joursFeries]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let decisionId: number;
      if (isEdit) {
        if (!decision) {
          setError("Décision introuvable");
          setLoading(false);
          return;
        }
        decisionId = decision.id;
      } else if (decision) {
        // Facture supplémentaire sur une décision déjà existante (venant de la fiche patient).
        decisionId = decision.id;
      } else {
        const numeroOrdreValue = Number(numeroOrdre);
        if (!numeroOrdreValue) {
          setError("Le N° d'ordre de la décision est requis");
          setLoading(false);
          return;
        }
        const newPatient = await patientsApi.create({
          nom,
          prenom,
          numeroAssureRacine: racine,
          numeroAssureCle: cle,
          qualiteBeneficiaire,
        });
        const newDecision = await decisionsApi.create(newPatient.id, { bureau, annee, numeroOrdre: numeroOrdreValue });
        setPatient(newPatient);
        decisionId = newDecision.id;
      }

      const payload = {
        decisionId,
        dateDebut,
        dateFin,
        nbSeances,
        seancesParSemaine,
        dateEdition,
        prestation,
      };
      let patientIdForRedirect = patient?.id;
      if (isEdit && id) {
        await facturesApi.update(Number(id), payload);
      } else {
        const facture = await facturesApi.create(payload);
        patientIdForRedirect ??= (await decisionsApi.get(facture.decisionId)).patientId;
      }
      navigate(patientIdForRedirect ? `/patients/${patientIdForRedirect}` : "/factures");
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
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Nom" htmlFor="nom">
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required disabled={readOnlyPatientDecision} />
            </Field>
            <Field label="Prénom" htmlFor="prenom">
              <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required disabled={readOnlyPatientDecision} />
            </Field>
            <Field label="Racine" htmlFor="racine" hint='Ex: "9875710" dans 9875710/0'>
              <Input id="racine" value={racine} onChange={(e) => setRacine(e.target.value)} required disabled={readOnlyPatientDecision} />
            </Field>
            <Field label="Clé" htmlFor="cle" hint='Ex: "0"'>
              <Input id="cle" value={cle} onChange={(e) => setCle(e.target.value)} required disabled={readOnlyPatientDecision} />
            </Field>
            <Field label="Qualité" htmlFor="qualite">
              <Select
                value={qualiteBeneficiaire}
                onValueChange={(v) => setQualiteBeneficiaire(v as QualiteBeneficiaire)}
                disabled={readOnlyPatientDecision}
              >
                <SelectTrigger id="qualite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITES.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Décision de prise en charge CNAM</CardTitle>
            <p className="text-sm text-muted-foreground">
              Format : bureau / année / n° ordre — ex. <span className="font-mono">40/2025/13819</span>
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Field label="Code bureau" htmlFor="bureau">
              <Input id="bureau" value={bureau} onChange={(e) => setBureau(e.target.value)} required disabled={readOnlyPatientDecision} />
            </Field>
            <Field label="Année" htmlFor="annee">
              <Input
                id="annee"
                type="number"
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                required
                disabled={readOnlyPatientDecision}
              />
            </Field>
            <Field label="N° ordre" htmlFor="numeroOrdre">
              <Input
                id="numeroOrdre"
                type="number"
                value={numeroOrdre}
                onChange={(e) => setNumeroOrdre(e.target.value)}
                required
                disabled={readOnlyPatientDecision}
              />
            </Field>
            <div className="col-span-3">
              <Field label="N° Décision" htmlFor="numeroDecision">
                <Input id="numeroDecision" value={`${bureau}/${annee}/${numeroOrdre}`} readOnly disabled />
              </Field>
            </div>
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

        {seancesPreview && seancesPreview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pointage automatique des séances</CardTitle>
              <p className="text-sm text-muted-foreground">
                Calculé à partir de la date de début, du nombre de séances et du rythme (dimanches et jours fériés exclus).
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-right">N°</TableHead>
                    <TableHead>Jour</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seancesPreview.map((s) => (
                    <TableRow key={s.numero}>
                      <TableCell className="text-right">{s.numero}</TableCell>
                      <TableCell>{JOURS_SEMAINE[new Date(`${s.date}T00:00:00`).getDay()]}</TableCell>
                      <TableCell>{formatDate(s.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
    </div>
  );
}
