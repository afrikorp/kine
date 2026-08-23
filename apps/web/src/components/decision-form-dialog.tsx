import { useEffect, useState, type FormEvent } from "react";
import { decisionsApi, ApiError } from "@/lib/api.js";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { ErrorBanner } from "@/components/error-banner.js";

export function DecisionFormDialog({
  open,
  onOpenChange,
  patientId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  onSaved: (decisionId: number) => void;
}) {
  const [bureau, setBureau] = useState("40");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [numeroOrdre, setNumeroOrdre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setBureau("40");
      setAnnee(new Date().getFullYear());
      setNumeroOrdre("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const decision = await decisionsApi.create(patientId, { bureau, annee, numeroOrdre: Number(numeroOrdre) });
      onSaved(decision.id);
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
          <DialogTitle>Nouvelle décision de prise en charge CNAM</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Format : bureau / année / n° ordre — ex. <span className="font-mono">40/2025/13819</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bureau" htmlFor="bureau">
              <Input id="bureau" value={bureau} onChange={(e) => setBureau(e.target.value)} required autoFocus />
            </Field>
            <Field label="Année" htmlFor="annee">
              <Input id="annee" type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} required />
            </Field>
            <Field label="N° ordre" htmlFor="numeroOrdre">
              <Input id="numeroOrdre" type="number" value={numeroOrdre} onChange={(e) => setNumeroOrdre(e.target.value)} required />
            </Field>
          </div>
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
