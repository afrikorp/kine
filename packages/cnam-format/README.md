# @kine/cnam-format

Génération du fichier électronique CNAM (format propriétaire, texte à largeur
fixe de 135 caractères) à partir des bordereaux/factures de l'application.

## ⚠️ Statut de la spec

Le format implémenté ici est **rétro-ingénié**, pas documenté officiellement
par la CNAM. Il a été déduit et validé par reconstruction byte-for-byte à
100% sur un échantillon de 3 bordereaux réels (81 lignes de détail + 3
en-têtes) — voir `test/fixtures/*.json` et `test/encode.test.ts`.

**Avant le tout premier dépôt réel à la CNAM**, il faut impérativement :

- Faire valider un fichier de test par la CNAM (ou comparer avec un fichier
  généré par l'ancien logiciel sur les mêmes données).
- Confirmer le sens de la "constante" en position 8-9 (toujours `01` dans
  l'échantillon, valeur/rôle inconnu).
- Confirmer le champ "séances/semaine" (position 67) : dans l'échantillon
  c'est une valeur saisie par l'utilisateur (77/81 correspondances exactes
  avec `nb_séances ÷ nb_semaines`, 4 écarts à ±1 près) — dans l'app c'est un
  champ de saisie explicite, jamais recalculé.
- Tester les cas non couverts par l'échantillon : n° facture ≥ 1000 (géré),
  taux de TVA ≠ 7% (le format ne stocke qu'un seul chiffre de %, donc un taux
  à deux chiffres comme 19% n'est pas représentable — lève une erreur),
  montants ≥ 999,9 DT (dépassement de champ — lève une erreur plutôt que de
  tronquer silencieusement).
- Confirmer l'encodage (ASCII/Latin-1 supposé, aucun texte libre dans le
  fichier) et la fin de ligne (LF vs CRLF, non tranchable sur l'échantillon).

## API

```ts
import {
  computeInvoiceAmounts,
  encodeBordereauFile,
  encodeBordereauLines,
  encodeBordereauHeaderLine,
  encodeFactureLine,
} from "@kine/cnam-format";

const amounts = computeInvoiceAmounts({ nbSeances: 12, prixUnitaire: 11.5, tauxTVA: 7 });
// { montantTTC: 138, montantHT: 128.972, montantTVA: 9.028 }

const fileContents = encodeBordereauFile(bordereau); // string prêt à télécharger/graver
```

`computeInvoiceAmounts` sert à calculer les montants **au moment de la
création de la facture** (avec le prix unitaire/taux de TVA en vigueur à
cette date) ; ces montants doivent ensuite être stockés tels quels sur la
facture et ne jamais être recalculés a posteriori si les paramètres globaux
changent.

## Tests

```sh
pnpm --filter @kine/cnam-format test
```

179 tests : régénération caractère pour caractère des 81 lignes de détail +
3 en-têtes des bordereaux réels 012/2024, 014/2024 et 017/2024, vérification
indépendante des formules TTC/HT/TVA sur chacune des 81 factures, et cas
limites (n° facture à 4 chiffres, dépassements de champs, taux de TVA non
représentable).
