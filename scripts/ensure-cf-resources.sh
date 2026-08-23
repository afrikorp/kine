#!/usr/bin/env bash
# Crée (si besoin) les ressources Cloudflare de app-kine-api — D1, KV, R2 —
# et injecte leurs vrais identifiants dans apps/api/wrangler.toml (qui ne
# contient que des placeholders dans le repo, suffisants pour le dev local).
#
# Idempotent : peut être relancé à chaque déploiement sans recréer les
# ressources existantes. Nécessite CLOUDFLARE_API_TOKEN et
# CLOUDFLARE_ACCOUNT_ID dans l'environnement, `jq`, et d'être lancé depuis
# la racine du repo (npx wrangler résolu via apps/api/node_modules).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/apps/api"

D1_NAME="app-kine-db"
KV_TITLE="app-kine-sessions"
R2_BUCKET="app-kine-files"

UUID_RE='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
HEX32_RE='^[0-9a-fA-F]{32}$'

echo "== D1 database ($D1_NAME) =="
D1_LIST=$(npx wrangler d1 list --json)
D1_ID=$(echo "$D1_LIST" | jq -r --arg NAME "$D1_NAME" '.[] | select(.name == $NAME) | .uuid' | head -n1)

if [ -z "${D1_ID}" ] || [ "${D1_ID}" = "null" ]; then
  echo "Pas trouvé, création de la base D1 $D1_NAME..."
  # `d1 create` ne supporte pas --json sur toutes les versions de wrangler
  # (contrairement à `d1 list`) : on récupère la sortie humaine et on tente
  # d'abord un parsing JSON, puis un repli sur la ligne `database_id = "..."`
  # du snippet TOML qu'elle affiche toujours.
  D1_CREATE_RAW=$(npx wrangler d1 create "$D1_NAME" 2>&1) || true
  echo "$D1_CREATE_RAW"
  D1_ID=$(echo "$D1_CREATE_RAW" | jq -r '.uuid // empty' 2>/dev/null || true)
  if [ -z "${D1_ID}" ]; then
    D1_ID=$(echo "$D1_CREATE_RAW" | grep -oE 'database_id[[:space:]]*=[[:space:]]*"[0-9a-fA-F-]+"' | grep -oE '"[0-9a-fA-F-]+"' | tr -d '"' | head -n1)
  fi
fi

if ! [[ "$D1_ID" =~ $UUID_RE ]]; then
  echo "::error::Impossible de déterminer l'UUID de la base D1 '$D1_NAME'. Sortie brute :"
  echo "$D1_LIST"
  exit 1
fi
echo "D1 database_id: $D1_ID"

echo "== KV namespace ($KV_TITLE) =="
# `kv namespace create <title>` préfixe le titre avec le nom du Worker
# (ex: "app-kine-api-app-kine-sessions") : on cherche par sous-chaîne plutôt
# que par égalité stricte pour rester idempotent malgré ce préfixage.
KV_LIST=$(npx wrangler kv namespace list)
KV_ID=$(echo "$KV_LIST" | jq -r --arg TITLE "$KV_TITLE" '.[] | select(.title | contains($TITLE)) | .id' | head -n1)

if [ -z "${KV_ID}" ] || [ "${KV_ID}" = "null" ]; then
  echo "Pas trouvé, création du namespace KV $KV_TITLE..."
  KV_CREATE_RAW=$(npx wrangler kv namespace create "$KV_TITLE" 2>&1) || true
  echo "$KV_CREATE_RAW"
  # Certaines versions de wrangler renvoient du JSON, d'autres un extrait TOML
  # humain contenant `id = "..."` : on tente les deux formats.
  KV_ID=$(echo "$KV_CREATE_RAW" | jq -r '.id // empty' 2>/dev/null || true)
  if [ -z "${KV_ID}" ]; then
    KV_ID=$(echo "$KV_CREATE_RAW" | grep -oE 'id[[:space:]]*=[[:space:]]*"[0-9a-fA-F]+"' | grep -oE '"[0-9a-fA-F]+"' | tr -d '"' | head -n1)
  fi
fi

if ! [[ "$KV_ID" =~ $HEX32_RE ]]; then
  echo "::error::Impossible de déterminer l'ID du namespace KV '$KV_TITLE'. Sortie brute :"
  echo "$KV_LIST"
  exit 1
fi
echo "KV namespace id: $KV_ID"

echo "== R2 bucket ($R2_BUCKET) =="
# `r2 bucket list --json` n'est pas fiable non plus sur cette version (sortie
# non-JSON mêlée aux bannières wrangler) : recherche texte simple, comme pour
# les commandes `create` ci-dessus.
R2_LIST=$(npx wrangler r2 bucket list 2>&1) || true
if echo "$R2_LIST" | grep -qF "$R2_BUCKET"; then
  R2_EXISTS="1"
else
  R2_EXISTS=""
fi

if [ -z "${R2_EXISTS}" ]; then
  echo "Pas trouvé, création du bucket R2 $R2_BUCKET..."
  # Tolère "already exists" si `r2 bucket list --json` avait mal détecté sa présence.
  R2_CREATE_OUTPUT=$(npx wrangler r2 bucket create "$R2_BUCKET" 2>&1) || {
    if ! echo "$R2_CREATE_OUTPUT" | grep -qi "already exists"; then
      echo "$R2_CREATE_OUTPUT"
      echo "::error::Échec de la création du bucket R2 '$R2_BUCKET'"
      exit 1
    fi
  }
  echo "$R2_CREATE_OUTPUT"
else
  echo "Bucket R2 déjà présent."
fi

echo "== Mise à jour de wrangler.toml =="
sed -i "s/__D1_DATABASE_ID__/${D1_ID}/" wrangler.toml
sed -i "s/__KV_NAMESPACE_ID__/${KV_ID}/" wrangler.toml
grep -E 'database_id|^id = ' wrangler.toml

echo "Ressources Cloudflare prêtes."
