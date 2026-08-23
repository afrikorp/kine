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
  D1_CREATE=$(npx wrangler d1 create "$D1_NAME" --json)
  D1_ID=$(echo "$D1_CREATE" | jq -r '.uuid // empty')
fi

if ! [[ "$D1_ID" =~ $UUID_RE ]]; then
  echo "::error::Impossible de déterminer l'UUID de la base D1 '$D1_NAME'. Sortie brute :"
  echo "$D1_LIST"
  exit 1
fi
echo "D1 database_id: $D1_ID"

echo "== KV namespace ($KV_TITLE) =="
KV_LIST=$(npx wrangler kv namespace list)
KV_ID=$(echo "$KV_LIST" | jq -r --arg TITLE "$KV_TITLE" '.[] | select(.title == $TITLE) | .id' | head -n1)

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
R2_LIST=$(npx wrangler r2 bucket list --json 2>/dev/null || echo '[]')
R2_EXISTS=$(echo "$R2_LIST" | jq -r --arg NAME "$R2_BUCKET" '(.buckets // .) | .[]? | select(.name == $NAME) | .name' | head -n1)

if [ -z "${R2_EXISTS}" ]; then
  echo "Pas trouvé, création du bucket R2 $R2_BUCKET..."
  npx wrangler r2 bucket create "$R2_BUCKET"
else
  echo "Bucket R2 déjà présent."
fi

echo "== Mise à jour de wrangler.toml =="
sed -i "s/__D1_DATABASE_ID__/${D1_ID}/" wrangler.toml
sed -i "s/__KV_NAMESPACE_ID__/${KV_ID}/" wrangler.toml
grep -E 'database_id|^id = ' wrangler.toml

echo "Ressources Cloudflare prêtes."
