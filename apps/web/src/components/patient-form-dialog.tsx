import { useEffect, useState, type FormEvent } from "react";
import { patientsApi, ApiError } from "@/lib/api.js";
import type { Patient, QualiteBeneficiaire } from "@/lib/types.js";
import { QUALITES } from "@/lib/types.js";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { ErrorBanner } from "@/components/error-banner.js";

const EMPTY = {
  nom: "",
  prenom: "",
  numeroAssureRacine: "",
  numeroAssureCle: "",
  qualiteBeneficiaire: "assure" as QualiteBeneficiaire,
  telephone: "",
  adresse: "",
  dateNaissance: "",
  notes: "",
};

export function PatientFormDialog({
  open,
  onOpenChange,
  onSaved,
  patient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  patient?: Patient;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        patient
          ? {
              nom: patient.nom,
              prenom: patient.prenom,
              numeroAssureRacine: patient.numeroAssureRacine,
              numeroAssureCle: patient.numeroAssureCle,
              qualiteBeneficiaire: patient.qualiteBeneficiaire,
              telephone: patient.telephone,
              adresse: patient.adresse,
              dateNaissance: patient.dateNaissance ?? "",
              notes: patient.notes,
            }
          : EMPTY,
      );
    }
  }, [open, patient]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = { ...form, dateNaissance: form.dateNaissance || null };
      if (patient) {
        await patientsApi.update(patient.id, payload);
      } else {
        await patientsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Modifier le patient" : "Nouveau patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom" htmlFor="nom">
              <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required autoFocus />
            </Field>
            <Field label="Prénom" htmlFor="prenom">
              <Input id="prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </Field>
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="N° assuré (racine)" htmlFor="racine" hint='Ex: "9875710" dans 9875710/0'>
              <Input
                id="racine"
                value={form.numeroAssureRacine}
                onChange={(e) => setForm({ ...form, numeroAssureRacine: e.target.value })}
                required
              />
            </Field>
            <Field label="Clé" htmlFor="cle" hint='Ex: "0"'>
              <Input
                id="cle"
                value={form.numeroAssureCle}
                onChange={(e) => setForm({ ...form, numeroAssureCle: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Qualité du bénéficiaire" htmlFor="qualite">
            <Select
              value={form.qualiteBeneficiaire}
              onValueChange={(v) => setForm({ ...form, qualiteBeneficiaire: v as QualiteBeneficiaire })}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone" htmlFor="telephone">
              <Input id="telephone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </Field>
            <Field label="Date de naissance" htmlFor="dateNaissance">
              <Input
                id="dateNaissance"
                type="date"
                value={form.dateNaissance}
                onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Adresse" htmlFor="adresse">
            <Input id="adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </Field>
          <ErrorBanner message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
