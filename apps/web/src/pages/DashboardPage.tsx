import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Users, FileText, FolderOutput, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { patientsApi, facturesApi, bordereauxApi } from "@/lib/api.js";
import type { FactureAvecPatient } from "@/lib/types.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { formatMontant } from "@/lib/utils.js";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function DashboardPage() {
  const anneeActuelle = new Date().getFullYear();
  const [nbPatients, setNbPatients] = useState<number | null>(null);
  const [factures, setFactures] = useState<FactureAvecPatient[]>([]);
  const [sansBordereau, setSansBordereau] = useState<FactureAvecPatient[]>([]);
  const [nbBordereaux, setNbBordereaux] = useState<number | null>(null);

  useEffect(() => {
    patientsApi.list().then((p) => setNbPatients(p.length));
    facturesApi.list({ annee: anneeActuelle }).then(setFactures);
    facturesApi.list({ sansBordereau: true }).then(setSansBordereau);
    bordereauxApi.list().then((b) => setNbBordereaux(b.length));
  }, [anneeActuelle]);

  const caParMois = useMemo(() => {
    const totals = new Array(12).fill(0);
    for (const f of factures) {
      const month = Number(f.dateEdition.slice(5, 7)) - 1;
      totals[month] += f.montantTtc;
    }
    return totals;
  }, [factures]);

  const totalCa = factures.reduce((sum, f) => sum + f.montantTtc, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">Aperçu de l'activité du cabinet — {anneeActuelle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Patients" value={nbPatients} to="/patients" />
        <StatCard icon={FileText} label="Factures cette année" value={factures.length} to="/factures" />
        <StatCard icon={FolderOutput} label="Bordereaux" value={nbBordereaux} to="/bordereaux" />
        <StatCard
          icon={AlertCircle}
          label="Factures à transmettre"
          value={sansBordereau.length}
          to="/factures?sansBordereau=1"
          warn={sansBordereau.length > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chiffre d'affaires mensuel {anneeActuelle}</CardTitle>
          <p className="text-sm text-muted-foreground">Total : {formatMontant(totalCa)} DT</p>
        </CardHeader>
        <CardContent>
          <Bar
            data={{
              labels: MOIS,
              datasets: [
                {
                  label: "CA TTC (DT)",
                  data: caParMois,
                  backgroundColor: "hsl(221 83% 40% / 0.7)",
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
            height={90}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  warn,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  to: string;
  warn?: boolean;
}) {
  return (
    <Link to={to}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`rounded-md p-2 ${warn ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
