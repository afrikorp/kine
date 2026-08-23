# @kine/web

Frontend React + Vite + TypeScript de KINE.CNAM, destiné à Cloudflare Pages.

## Stack

- React + Vite + TypeScript, Tailwind CSS + composants shadcn/ui maison
  (Radix UI + class-variance-authority)
- React Router pour la navigation
- Chart.js (via react-chartjs-2) pour le graphique du tableau de bord
- pdf-lib pour l'export PDF (facture, mémoire des séances, bordereau) —
  **côté client**, chargé à la demande (code-splitting)
- SheetJS/xlsx pour l'export Excel des factures — également chargé à la
  demande
- `@kine/cnam-format`, `@kine/scheduling`, `@kine/shared` (workspace) :
  mêmes calculs et mêmes formats que l'API, réutilisés tels quels côté
  client pour l'aperçu des montants et la génération des PDF

## Écrans

- Connexion / premier démarrage (création du compte du cabinet)
- Tableau de bord (statistiques + CA mensuel)
- Patients (liste, recherche, création/édition, décisions CNAM)
- Factures (liste par année, création avec aperçu des montants en direct,
  PDF facture, PDF mémoire des séances, export Excel)
- Bordereaux (sélection des factures non transmises, PDF, téléchargement
  du fichier électronique CNAM)
- Paramètres (cabinet, tarifs historisés, jours fériés)

## Développement

```sh
pnpm --filter @kine/api dev     # API sur http://localhost:8787
pnpm --filter @kine/web dev     # Frontend sur http://localhost:5173
```

`VITE_API_URL` (optionnel, défaut `http://localhost:8787`) pointe vers
l'API. En production, à définir vers l'URL du Worker déployé, et
`ALLOWED_ORIGIN` côté Worker vers l'URL Cloudflare Pages du frontend.

## Validation

Testé de bout en bout dans un vrai navigateur (Chromium via Playwright,
contre l'API réelle en local avec D1/KV/R2 simulés) : premier démarrage,
configuration du cabinet, création patient → décision → facture (montants
recalculés en direct et identiques à la fixture réelle facture 459 du
bordereau 017/2024), génération PDF facture/mémoire des séances/bordereau
(rendu visuel vérifié), création de bordereau et téléchargement du fichier
CNAM (contenu identique au format validé dans `@kine/cnam-format`), export
Excel, et écran de connexion en cas d'échec d'authentification.

`pnpm --filter @kine/web build` compile proprement (`tsc --noEmit` +
`vite build`).
