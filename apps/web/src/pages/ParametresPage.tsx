import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cabinetApi, parametresApi, ApiError } from "@/lib/api.js";
import type { Cabinet, JourFerie, Tarif } from "@/lib/types.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { ErrorBanner } from "@/components/error-banner.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { formatDate, formatMontant, todayIso } from "@/lib/utils.js";

const EMPTY_CABINET: Cabinet = {
  nom: "",
  adresse: "",
  telephone: "",
  rc: "",
  matriculeFiscal: "",
  rib: "",
  codeCnamPraticien: "",
  cleCnamPraticien: "",
  numeroDecision: "",
  specialite: "",
  banque: "",
  typePraticien: "",
  codePrestation: "75",
  codeEmployeur: "",
  cleEmployeur: "",
  updatedAt: "",
};

const CODES_PRESTATION = [{ value: "75", label: "75 — Kinésithérapie" }];

function CabinetTab() {
  const [cabinet, setCabinet] = useState<Cabinet>(EMPTY_CABINET);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cabinetApi.get().then((c) => c && setCabinet(c));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const saved = await cabinetApi.save(cabinet);
      setCabinet(saved);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du cabinet</CardTitle>
        <p className="text-sm text-muted-foreground">Reprises sur les factures et bordereaux imprimés</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium text-muted-foreground">Données société</legend>
              <Field label="Responsable" htmlFor="nom">
                <Input id="nom" value={cabinet.nom} onChange={(e) => setCabinet({ ...cabinet, nom: e.target.value })} required />
              </Field>
              <Field label="Spécialité" htmlFor="specialite">
                <Input id="specialite" value={cabinet.specialite} onChange={(e) => setCabinet({ ...cabinet, specialite: e.target.value })} />
              </Field>
              <Field label="Adresse" htmlFor="adresse">
                <Input id="adresse" value={cabinet.adresse} onChange={(e) => setCabinet({ ...cabinet, adresse: e.target.value })} />
              </Field>
              <Field label="Tél./Gsm" htmlFor="telephone">
                <Input id="telephone" value={cabinet.telephone} onChange={(e) => setCabinet({ ...cabinet, telephone: e.target.value })} />
              </Field>
              <Field label="R.C" htmlFor="rc">
                <Input id="rc" value={cabinet.rc} onChange={(e) => setCabinet({ ...cabinet, rc: e.target.value })} />
              </Field>
              <Field label="Matricule fiscale" htmlFor="matriculeFiscal">
                <Input
                  id="matriculeFiscal"
                  value={cabinet.matriculeFiscal}
                  onChange={(e) => setCabinet({ ...cabinet, matriculeFiscal: e.target.value })}
                />
              </Field>
              <Field label="RIB/RIP" htmlFor="rib">
                <Input id="rib" value={cabinet.rib} onChange={(e) => setCabinet({ ...cabinet, rib: e.target.value })} />
              </Field>
              <Field label="Banque" htmlFor="banque">
                <Input id="banque" value={cabinet.banque} onChange={(e) => setCabinet({ ...cabinet, banque: e.target.value })} />
              </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium text-muted-foreground">Données professionnelles</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" htmlFor="typePraticien">
                  <Input
                    id="typePraticien"
                    value={cabinet.typePraticien}
                    onChange={(e) => setCabinet({ ...cabinet, typePraticien: e.target.value })}
                  />
                </Field>
                <Field label="Code" htmlFor="codeCnamPraticien" hint='Ex: "29875"'>
                  <Input
                    id="codeCnamPraticien"
                    value={cabinet.codeCnamPraticien}
                    onChange={(e) => setCabinet({ ...cabinet, codeCnamPraticien: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Clé" htmlFor="cleCnamPraticien" hint='Ex: "96"'>
                  <Input
                    id="cleCnamPraticien"
                    value={cabinet.cleCnamPraticien}
                    onChange={(e) => setCabinet({ ...cabinet, cleCnamPraticien: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Code CNAM conventionnel" htmlFor="codeCnamConventionnel">
                  <Input
                    id="codeCnamConventionnel"
                    value={`${cabinet.typePraticien}/${cabinet.codeCnamPraticien}/${cabinet.cleCnamPraticien}`}
                    readOnly
                    disabled
                  />
                </Field>
              </div>

              <Field label="Code prestation" htmlFor="codePrestation">
                <Select
                  value={cabinet.codePrestation}
                  onValueChange={(value) => setCabinet({ ...cabinet, codePrestation: value })}
                >
                  <SelectTrigger id="codePrestation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODES_PRESTATION.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Cod. Employeur" htmlFor="codeEmployeur">
                  <Input
                    id="codeEmployeur"
                    value={cabinet.codeEmployeur}
                    onChange={(e) => setCabinet({ ...cabinet, codeEmployeur: e.target.value })}
                  />
                </Field>
                <Field label="Clé Employeur" htmlFor="cleEmployeur">
                  <Input
                    id="cleEmployeur"
                    value={cabinet.cleEmployeur}
                    onChange={(e) => setCabinet({ ...cabinet, cleEmployeur: e.target.value })}
                  />
                </Field>
                <Field label="N. Employeur" htmlFor="numeroEmployeur">
                  <Input
                    id="numeroEmployeur"
                    value={`${cabinet.codeEmployeur}/${cabinet.cleEmployeur}`}
                    readOnly
                    disabled
                  />
                </Field>
              </div>

              <Field label="N° Décision" htmlFor="numeroDecision">
                <Input
                  id="numeroDecision"
                  value={cabinet.numeroDecision}
                  onChange={(e) => setCabinet({ ...cabinet, numeroDecision: e.target.value })}
                />
              </Field>
            </fieldset>
          </div>

          <ErrorBanner message={error} />
          {saved && <p className="text-sm text-green-700">Enregistré.</p>}
          <div>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TarifTab() {
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [prixUnitaire, setPrixUnitaire] = useState("11.5");
  const [tauxTva, setTauxTva] = useState("7");
  const [dateEffet, setDateEffet] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reload() {
    parametresApi.listTarifs().then(setTarifs);
  }
  useEffect(reload, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await parametresApi.addTarif({ prixUnitaire: Number(prixUnitaire), tauxTva: Number(tauxTva), dateEffet });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un nouveau tarif</CardTitle>
          <p className="text-sm text-muted-foreground">
            Les factures déjà émises gardent le tarif en vigueur au moment de leur création.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-4 items-end gap-3">
            <Field label="Prix unitaire (DT)" htmlFor="prixUnitaire">
              <Input id="prixUnitaire" type="number" step="0.001" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} required />
            </Field>
            <Field label="Taux TVA (%)" htmlFor="tauxTva">
              <Input id="tauxTva" type="number" step="0.1" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)} required />
            </Field>
            <Field label="Date d'effet" htmlFor="dateEffet">
              <Input id="dateEffet" type="date" value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </form>
          <ErrorBanner message={error} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des tarifs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date d'effet</TableHead>
                <TableHead>Prix unitaire</TableHead>
                <TableHead>Taux TVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.dateEffet)}</TableCell>
                  <TableCell>{formatMontant(t.prixUnitaire)} DT</TableCell>
                  <TableCell>{t.tauxTva}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function JoursFeriesTab() {
  const [jours, setJours] = useState<JourFerie[]>([]);
  const [date, setDate] = useState(todayIso());
  const [libelle, setLibelle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reload() {
    parametresApi.listJoursFeries().then(setJours);
  }
  useEffect(reload, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await parametresApi.addJourFerie({ date, libelle });
      setLibelle("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await parametresApi.deleteJourFerie(id);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un jour férié</CardTitle>
          <p className="text-sm text-muted-foreground">
            Liste modifiable manuellement chaque année (les fêtes religieuses mobiles ne sont pas calculées automatiquement).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-[auto_1fr_auto] items-end gap-3">
            <Field label="Date" htmlFor="date">
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Libellé" htmlFor="libelle">
              <Input id="libelle" value={libelle} onChange={(e) => setLibelle(e.target.value)} required placeholder="Ex: Aïd el-Fitr" />
            </Field>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </form>
          <ErrorBanner message={error} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jours fériés enregistrés</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jours.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>{formatDate(j.date)}</TableCell>
                  <TableCell>{j.libelle}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(j.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground">Cabinet, tarifs et jours fériés</p>
      </div>

      <Tabs defaultValue="cabinet">
        <TabsList>
          <TabsTrigger value="cabinet">Cabinet</TabsTrigger>
          <TabsTrigger value="tarif">Tarifs</TabsTrigger>
          <TabsTrigger value="jours-feries">Jours fériés</TabsTrigger>
        </TabsList>
        <TabsContent value="cabinet">
          <CabinetTab />
        </TabsContent>
        <TabsContent value="tarif">
          <TarifTab />
        </TabsContent>
        <TabsContent value="jours-feries">
          <JoursFeriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
