# @kine/scheduling

Calcule les dates du "mémoire des séances" (Séance N° / Date / Signature) à
partir de la date de début, du nombre de séances et du rythme
séances/semaine, en excluant les dimanches et les jours fériés.

## ⚠️ Statut : heuristique, pas une reconstruction certifiée

Contrairement à `@kine/cnam-format` (validé byte-for-byte sur l'intégralité
de l'échantillon), cette logique n'a **pas** de spécification ni de
fixtures donnant les dates exactes de chaque séance — seules la date de
début, la date de fin et le nombre de séances des 81 factures réelles sont
connus. Le cycle d'écarts utilisé par rythme a été choisi par recherche
exhaustive pour reproduire au mieux la dateFin réelle de ces factures :

- **2/semaine** : confirmé sur 100% de l'échantillon (3/3).
- **3/semaine** : confirmé sur 76% (56/74) ; les 18 restantes tombent
  exactement 1 jour plus tôt que la réalité — écart probablement dû à un
  jour férié mobile (Aïd, etc.) non listé pour 2024/2025 dans
  l'échantillon. Une fois ce jour ajouté aux paramètres, le calcul devrait
  correspondre.
- **4/semaine** : échantillon trop petit (4 factures) pour être confirmé.

Voir `src/compute-seance-dates.ts` et `test/compute-seance-dates.test.ts`
pour le détail. À vérifier contre les impressions de l'ancien logiciel
avant de s'y fier pour un patient réel, en particulier au rythme 4/semaine.

## API

```ts
import { computeSeanceDates } from "@kine/scheduling";

const dates = computeSeanceDates({
  dateDebut: "2025-06-02",
  nbSeances: 12,
  seancesParSemaine: 3,
  joursFeries: ["2025-06-06"], // dates ISO, en plus des dimanches
});
// [{ numero: 1, date: "2025-06-02" }, ..., { numero: 12, date: "2025-06-27" }]
```
