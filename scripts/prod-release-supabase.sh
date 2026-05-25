#!/usr/bin/env bash
# Full Supabase production sync: schema, reference-data hygiene, edge functions, auth platform.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN
#
# Migrations, demo cleanup, and verify use the Management API (no DB password).
# Optional CLI fallback when PROD_DB_PUSH_FALLBACK=true:
#   SUPABASE_PROD_DB_PASSWORD or SUPABASE_PROD_DATABASE_URL
#
# Optional env (apply Resend SMTP when set — password never committed):
#   SUPABASE_PROD_PROJECT_REF  (default ziykaxyadcdmyakzvjff)
#   SUPABASE_RESEND_SMTP_PASSWORD
#
# Usage:
#   ./scripts/prod-release-supabase.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/prod-platform-config.env"

PROJECT_REF="${SUPABASE_PROD_PROJECT_REF:-ziykaxyadcdmyakzvjff}"
POOLER_HOST="${PROD_POOLER_HOST:-aws-0-us-west-2.pooler.supabase.com}"

require_env() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing required env: $1" >&2
    exit 1
  fi
}

require_env SUPABASE_ACCESS_TOKEN

trim_secret() {
  printf '%s' "${1}" | tr -d '\r\n'
}

apply_migrations_management_api() {
  echo "Applying migrations via Management API (SUPABASE_ACCESS_TOKEN) …"
  SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}" node "${ROOT_DIR}/scripts/push-migrations-management-api.mjs"
}

apply_migrations_cli() {
  local db_url="$1"
  echo "Fallback: supabase db push via pooler …"
  echo 'Y' | supabase db push --db-url "${db_url}" --include-all --yes
}

build_prod_database_url() {
  if [[ -n "${SUPABASE_PROD_DATABASE_URL:-}" ]]; then
    trim_secret "${SUPABASE_PROD_DATABASE_URL}"
    return
  fi

  if [[ -z "${SUPABASE_PROD_DB_PASSWORD:-}" ]]; then
    return 1
  fi

  local password
  password="$(trim_secret "${SUPABASE_PROD_DB_PASSWORD}")"

  PROJECT_REF="${PROJECT_REF}" \
  SUPABASE_PROD_DB_PASSWORD="${password}" \
  POOLER_HOST="${POOLER_HOST}" \
  node <<'NODE'
const ref = process.env.PROJECT_REF;
const password = process.env.SUPABASE_PROD_DB_PASSWORD;
const poolerHost = process.env.POOLER_HOST;
const encodedPassword = encodeURIComponent(password);
process.stdout.write(
  `postgresql://postgres.${ref}:${encodedPassword}@${poolerHost}:5432/postgres`,
);
NODE
}

run_sql_management_api() {
  local sql_file="$1"
  SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}" \
    node "${ROOT_DIR}/scripts/run-sql-management-api.mjs" "${sql_file}"
}

echo "=== [1/5] Apply database migrations to ${PROJECT_REF} ==="
cd "${ROOT_DIR}"

if ! apply_migrations_management_api; then
  echo "Management API migration apply failed." >&2
  if [[ "${PROD_DB_PUSH_FALLBACK:-}" == "true" ]] && PROD_DATABASE_URL="$(build_prod_database_url 2>/dev/null || true)" && [[ -n "${PROD_DATABASE_URL}" ]]; then
    if ! command -v supabase >/dev/null 2>&1; then
      echo "supabase CLI not found for fallback" >&2
      exit 1
    fi
    apply_migrations_cli "${PROD_DATABASE_URL}" || exit 1
  else
    echo "Prod migrations use SUPABASE_ACCESS_TOKEN only (set PROD_DB_PUSH_FALLBACK=true to try db push)." >&2
    exit 1
  fi
fi

echo "=== [2/5] Remove demo rows (idempotent) ==="
run_sql_management_api "${ROOT_DIR}/scripts/prod-demo-cleanup.sql"

echo "=== [3/5] Verify reference data ==="
run_sql_management_api "${ROOT_DIR}/scripts/prod-release-verify.sql"

echo "=== [4/5] Deploy edge functions ==="
export SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}"
node "${ROOT_DIR}/scripts/deploy-edge-functions.mjs"

echo "=== [5/5] Sync auth platform (templates, site URL, redirects) ==="
"${ROOT_DIR}/scripts/sync-prod-auth-platform.sh" "${PROJECT_REF}"

echo "Supabase production release complete for ${PROJECT_REF}."
