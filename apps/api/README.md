# @kine/api — Worker API + schéma D1

Worker Cloudflare (Hono) exposant l'API REST de KINE.CNAM, et le schéma D1
(étape 3) sur lequel elle s'appuie.

## Schéma D1

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

## API

Authentification par cookie de session (HttpOnly), stockée dans KV
(`SESSIONS`). Toutes les routes `/api/*` sauf `/api/auth/*` exigent une
session valide.

- `POST /api/auth/setup` — bootstrap : crée le seul utilisateur de l'app
  (refuse si un utilisateur existe déjà).
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/PUT /api/cabinet` — infos cabinet (singleton)
- `GET/POST /api/parametres/tarif`, `GET /api/parametres/tarif/actuel?date=` —
  tarif historisé, résolution par date
- `GET/POST /api/parametres/jours-feries`, `DELETE .../:id`
- `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/:id`
- `GET/POST /api/patients/:patientId/decisions`, `GET/DELETE /api/decisions/:id`
- `GET/POST /api/factures`, `GET/PUT/DELETE /api/factures/:id` — calcule
  TTC/HT/TVA via `@kine/cnam-format` à partir du tarif résolu (ou fourni
  explicitement) ; verrouillée dès qu'une facture est transmise dans un
  bordereau
- `GET /api/factures/:id/memoire-seances` — dates de séances via
  `@kine/scheduling`, jours fériés inclus
- `GET/POST /api/bordereaux`, `GET /api/bordereaux/:id` (totaux + montant
  en toutes lettres via `@kine/shared`)
- `GET /api/bordereaux/:id/cnam-file` — génère le fichier électronique
  CNAM (`@kine/cnam-format`), le stocke sur R2 (`FILES`) et le renvoie en
  téléchargement

## Tests

Tests d'intégration via `@cloudflare/vitest-pool-workers` : Worker réel,
D1/KV/R2 simulés (Miniflare), migrations appliquées automatiquement avant
chaque fichier de test (`test/apply-migrations.ts`).

```sh
pnpm --filter @kine/api test
```

26 tests, dont le plus significatif : **reproduction caractère pour
caractère du bordereau réel 017/2024 (32 factures) en passant uniquement
par l'API HTTP** — création des patients/décisions/factures via `POST`,
assemblage du bordereau, puis comparaison du fichier CNAM généré par
`GET /api/bordereaux/:id/cnam-file` aux mêmes fixtures que
`@kine/cnam-format`. Valide le câblage complet DB → API → fichier, en plus
de la logique de formatage déjà validée à 100% dans `@kine/cnam-format`.

## Commandes

```sh
# Appliquer les migrations sur la base locale (SQLite via Miniflare)
pnpm --filter @kine/api db:migrate:local

# Sur la base D1 distante (après `wrangler d1 create kine-cnam-db` et mise
# à jour de database_id dans wrangler.toml)
pnpm --filter @kine/api db:migrate:remote

# Requête ad-hoc sur la base locale
pnpm --filter @kine/api db:console:local "SELECT * FROM parametres_tarif;"

# Lancer le Worker en local
pnpm --filter @kine/api dev
```

## À faire avant le premier déploiement

- `wrangler d1 create kine-cnam-db` puis reporter le `database_id` réel
  dans `wrangler.toml`.
- `wrangler kv namespace create SESSIONS` puis reporter l'`id` réel.
- `wrangler r2 bucket create kine-cnam-files`.
- Remplacer les placeholders dans `wrangler.toml`, et définir
  `ALLOWED_ORIGIN` (var wrangler) une fois le domaine Cloudflare Pages du
  frontend connu (étape 5) — sans quoi le CORS reflète l'origine de la
  requête, pratique en développement mais à restreindre en production.
- Appeler `POST /api/auth/setup` une première fois pour créer le compte du
  praticien.
