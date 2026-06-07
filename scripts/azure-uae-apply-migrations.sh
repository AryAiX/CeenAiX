#!/usr/bin/env bash
# Apply CeenAiX schema/reference migrations to the Azure UAE self-hosted
# Supabase Postgres without exposing Postgres publicly.
#
# Intended usage:
#   ssh -fN -L 6543:localhost:5432 azureuser@<vm-ip>
#   AZURE_UAE_DB_URL='postgresql://postgres:<password>@127.0.0.1:6543/postgres' \
#     ./scripts/azure-uae-apply-migrations.sh
#
# The script mirrors the production no-demo-data strategy:
#   1. Mark pure demo migrations as applied.
#   2. Mark the known production-skipped 20260413 repair migrations as applied.
#   3. Push the remaining canonical migrations.
#   4. Run the idempotent production demo cleanup SQL.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_URL="${AZURE_UAE_DB_URL:-}"

if [[ -z "${DB_URL}" ]]; then
  echo "Missing required env: AZURE_UAE_DB_URL" >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

repair_applied() {
  local version="$1"
  echo "Marking migration ${version} as applied on Azure UAE..."
  "${SUPABASE_CMD[@]}" migration repair --status applied "${version}" --db-url "${DB_URL}"
}

require_cmd node
require_cmd psql

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  require_cmd npx
  SUPABASE_CMD=(npx supabase)
fi

cd "${ROOT_DIR}"

echo "=== [1/4] Mark pure demo migrations as applied ==="
while IFS= read -r raw_line; do
  line="${raw_line%%#*}"
  version="$(printf '%s' "${line}" | tr -d '[:space:]')"
  if [[ "${version}" =~ ^[0-9]{14}$ ]]; then
    repair_applied "${version}"
  fi
done < "${ROOT_DIR}/scripts/prod-demo-migrations.txt"

echo "=== [2/4] Mark production-skipped repair migrations as applied ==="
for version in 20260413120000 20260413120100 20260413120200; do
  repair_applied "${version}"
done

echo "=== [3/4] Push canonical schema/reference migrations ==="
"${SUPABASE_CMD[@]}" db push --db-url "${DB_URL}" --include-all --yes

echo "=== [4/4] Remove demo rows and verify reference data ==="
psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/scripts/prod-demo-cleanup.sql"

echo "Azure UAE migration sync complete."
