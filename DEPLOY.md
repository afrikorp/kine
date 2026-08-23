# Déploiement Cloudflare (Pages + Workers + D1/KV/R2)

Entièrement automatisé via `.github/workflows/deploy.yml`. Aucune commande
`wrangler` à taper à la main pour un déploiement normal.

## Mise en place (une seule fois)

1. Créer un **API Token** Cloudflare : dashboard → *My Profile* →
   *API Tokens* → *Create Token* → *Custom Token*, avec :
   - Account → Workers Scripts → Edit
   - Account → Workers KV Storage → Edit
   - Account → D1 → Edit
   - Account → Workers R2 Storage → Edit
   - Account → Cloudflare Pages → Edit
2. L'ajouter comme secret du repo GitHub : *Settings* → *Secrets and
   variables* → *Actions* → *New repository secret* → nom
   `CLOUDFLARE_API_TOKEN`.

C'est le **seul secret nécessaire** — le workflow résout automatiquement
l'account ID Cloudflare à partir du token (`GET /accounts` ne renvoie
qu'un compte si le token n'a accès qu'à celui-là).

## Ce que fait le workflow

Déclenché sur push vers `main`, ou manuellement (*Actions* → *Deploy to
Cloudflare* → *Run workflow*, en choisissant la branche).

1. **`deploy-api`** :
   - résout l'account ID Cloudflare depuis le token ;
   - `scripts/ensure-cf-resources.sh` : crée (si besoin, idempotent) la
     base D1 `app-kine-db`, le namespace KV `app-kine-sessions` et le
     bucket R2 `app-kine-files`, puis injecte leurs vrais identifiants
     dans `apps/api/wrangler.toml` (qui ne contient que des placeholders
     dans le repo — suffisants pour `wrangler dev --local`, jamais commit
     avec de vraies valeurs) ;
   - applique les migrations D1 sur la base distante
     (`wrangler d1 migrations apply --remote`, idempotent) ;
   - déploie le Worker (`wrangler deploy`), avec `ALLOWED_ORIGIN` fixée à
     `https://app-kine.pages.dev` pour le CORS — passée en `--var` au
     moment du déploiement, jamais écrite dans `wrangler.toml` (qui reste
     permissif par défaut pour le dev local).
2. **`deploy-web`** (après `deploy-api`) :
   - build du frontend avec `VITE_API_URL` pointé vers l'URL du Worker
     tout juste déployé (capturée depuis la sortie de `wrangler deploy`) ;
   - déploie sur Cloudflare Pages (`wrangler pages deploy`, projet
     `app-kine`, créé automatiquement au premier déploiement).

## Après le tout premier déploiement

Aucun compte n'existe encore dans l'app (elle démarre à vide). Ouvrir
`https://app-kine.pages.dev/setup` et créer le compte du cabinet, puis
renseigner les infos du cabinet dans *Paramètres* (nom, code/clé CNAM
praticien, etc. — nécessaires pour générer le fichier CNAM).

## Ressources créées côté Cloudflare

| Ressource | Nom |
|---|---|
| Worker | `app-kine-api` |
| D1 | `app-kine-db` |
| KV | `app-kine-sessions` (binding `SESSIONS`) |
| R2 | `app-kine-files` |
| Pages | `app-kine` |

## Limite connue de ce premier run

`scripts/ensure-cf-resources.sh` parse la sortie JSON de plusieurs
sous-commandes `wrangler` (`d1 list/create`, `kv namespace list/create`,
`r2 bucket list`). Le format exact peut varier légèrement d'une version de
wrangler à l'autre ; le script valide le format des IDs obtenus (UUID pour
D1, hex 32 caractères pour KV) et échoue explicitement avec la sortie
brute en log si le parsing échoue, plutôt que d'écrire une valeur invalide
dans `wrangler.toml`. Si le tout premier run échoue à cette étape, le log
du job indique précisément quelle commande a renvoyé un format inattendu —
un ajustement du script suffit, pas besoin de tout redéployer à la main.
