import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { facturesApi, ApiError } from "@/lib/api.js";
import type { FactureAvecPatient } from "@/lib/types.js";
import { loadFactureContext } from "@/lib/pdf/load-facture-context.js";
import { generateFacturePdf } from "@/lib/pdf/facture-pdf.js";
import { generateMemoireSeancesPdf } from "@/lib/pdf/memoire-seances-pdf.js";
import { downloadBytes } from "@/lib/download.js";

export function FactureActions({ facture, onDeleted }: { facture: FactureAvecPatient; onDeleted: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const transmise = facture.bordereauId != null;

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof ApiError || err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  }

  async function handlePrintFacture() {
    await withBusy("pdf", async () => {
      const ctx = await loadFactureContext(facture.id);
      const bytes = await generateFacturePdf(ctx);
      downloadBytes(bytes, `facture-${facture.numero}-${facture.anneeFacture}.pdf`, "application/pdf");
    });
  }

  async function handlePrintMemoire() {
    await withBusy("memoire", async () => {
      const ctx = await loadFactureContext(facture.id);
      const dates = await facturesApi.memoireSeances(facture.id);
      const bytes = await generateMemoireSeancesPdf({ ...ctx, dates });
      downloadBytes(bytes, `memoire-seances-${facture.numero}-${facture.anneeFacture}.pdf`, "application/pdf");
    });
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la facture n° ${facture.numero}/${facture.anneeFacture} ?`)) return;
    await withBusy("delete", async () => {
      await facturesApi.remove(facture.id);
      onDeleted();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" title="Facture PDF" disabled={busy === "pdf"} onClick={handlePrintFacture}>
        <FileDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Mémoire des séances" disabled={busy === "memoire"} onClick={handlePrintMemoire}>
        <ListChecks className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={transmise ? "Déjà transmise, non modifiable" : "Modifier"}
        disabled={transmise}
        onClick={() => navigate(`/factures/${facture.id}/modifier`)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={transmise ? "Déjà transmise, non supprimable" : "Supprimer"}
        disabled={transmise || busy === "delete"}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
