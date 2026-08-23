import { useEffect, useState, type FormEvent } from "react";
import { facturesApi, bordereauxApi, ApiError } from "@/lib/api.js";
import type { FactureAvecPatient } from "@/lib/types.js";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { ErrorBanner } from "@/components/error-banner.js";
import { formatDate, formatMontant } from "@/lib/utils.js";

export function NewBordereauDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (bordereauId: number) => void;
}) {
  const [factures, setFactures] = useState<FactureAvecPatient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [numero, setNumero] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSelected(new Set());
      setNumero("");
      facturesApi.list({ sansBordereau: true }).then(setFactures);
    }
  }, [open]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalTtc = factures.filter((f) => selected.has(f.id)).reduce((sum, f) => sum + f.montantTtc, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Sélectionnez au moins une facture");
      return;
    }
    setLoading(true);
    try {
      const bordereau = await bordereauxApi.create({
        numero: Number(numero),
        annee,
        factureIds: Array.from(selected),
      });
      onSaved(bordereau.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau bordereau de transmission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° bordereau" htmlFor="numero">
              <Input id="numero" type="number" value={numero} onChange={(e) => setNumero(e.target.value)} required autoFocus />
            </Field>
            <Field label="Année" htmlFor="annee">
              <Input id="annee" type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} required />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Factures à transmettre ({factures.length} disponible(s))</p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {factures.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Aucune facture en attente de transmission</p>
              )}
              {factures.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-accent">
                  <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                  <span className="flex-1">
                    {f.numero}/{f.anneeFacture} — {f.patientNom} {f.patientPrenom} —{" "}
                    {formatDate(f.dateDebut)} → {formatDate(f.dateFin)}
                  </span>
                  <span className="font-medium">{formatMontant(f.montantTtc)} DT</span>
                </label>
              ))}
            </div>
          </div>

          {selected.size > 0 && (
            <p className="text-sm">
              {selected.size} facture(s) sélectionnée(s) — Total TTC : <span className="font-semibold">{formatMontant(totalTtc)} DT</span>
            </p>
          )}

          <ErrorBanner message={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le bordereau"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
