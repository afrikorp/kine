# @kine/api — schéma D1

Ce package héberge le Worker API (implémenté à l'étape 4) et le schéma D1
(étape 3, terminée ici).

## Schéma

Voir `migrations/0001_init.sql` pour le détail commenté. Résumé des tables :

- `cabinet` — infos du cabinet (singleton, id=1) : nom, adresse, tél, RC,
  matricule fiscal, RIB, code/clé CNAM du praticien.
- `users` — auth utilisateur/mot de passe (un seul praticien).
- `parametres_tarif` — prix unitaire + taux de TVA, **historisés par
  `date_effet`** : une facture garde le tarif en vigueur au moment de sa
  création, même si le tarif change ensuite.
- `jours_feries` — liste modifiable manuellement chaque année (pas de
  calcul des fêtes religieuses mobiles).
- `patients` — nom/prénom, n° assuré CNAM (racine + clé), qualité du
  bénéficiaire, contact.
- `decisions_cnam` — décision de prise en charge (bureau/année/n° ordre),
  liée à un patient ; une décision peut couvrir plusieurs factures.
- `bordereaux` — bordereau de transmission (n°/année).
- `factures` — liée à une décision et (optionnellement, une fois
  transmise) à un bordereau ; stocke un **instantané** de `prix_unitaire`/
  `taux_tva`/montants au moment de la création.

Pas de migration de données de l'ancien logiciel : `0001_init.sql` ne fait
que créer les tables. `0002_seed.sql` insère uniquement des données de
bootstrap propres à l'app (tarif en vigueur, jours fériés à date fixe) —
pas des données patients/factures.

## Commandes

```sh
# Appliquer les migrations sur la base locale (SQLite via Miniflare)
pnpm --filter @kine/api db:migrate:local

# Sur la base D1 distante (après `wrangler d1 create kine-cnam-db` et mise
# à jour de database_id dans wrangler.toml)
pnpm --filter @kine/api db:migrate:remote

# Requête ad-hoc sur la base locale
pnpm --filter @kine/api db:console:local "SELECT * FROM parametres_tarif;"
```

Schéma validé par une insertion de bout en bout (patient → décision →
bordereau → facture, jointure complète) reproduisant la facture n°459 du
bordereau 017/2024 utilisée comme fixture dans `@kine/cnam-format`, et par
un test de contrainte CHECK (`seances_par_semaine` rejette une valeur hors
`{2,3,4}`).

## À faire avant le premier déploiement

- `wrangler d1 create kine-cnam-db` puis reporter le `database_id` réel
  dans `wrangler.toml`.
- `wrangler kv namespace create SESSIONS` puis reporter l'`id` réel.
- `wrangler r2 bucket create kine-cnam-files`.
- Remplacer les placeholders dans `wrangler.toml`.

`src/index.ts` n'est qu'un stub de santé (`/health`) le temps de l'étape 4
(routing + handlers CRUD).
