#!/usr/bin/env bash
# Dev Supabase sync: schema, edge functions, auth platform (keeps demo seed data).
#
# Required env:
#   SUPABASE_ACCESS_TOKEN
#
# Migrations: Management API (no DB password). Optional fallback:
#   SUPABASE_DEV_DB_PASSWORD or SUPABASE_DEV_DATABASE_URL
#
# Optional:
#   SUPABASE_DEV_PROJECT_REF
#   SUPABASE_RESEND_SMTP_PASSWORD

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/dev-platform-config.env"

PROJECT_REF="${SUPABASE_DEV_PROJECT_REF:-${DEV_PROJECT_REF:-lgfaucsfiyxvmsghnpey}}"
POOLER_HOST="${DEV_POOLER_HOST:-aws-0-us-west-2.pooler.supabase.com}"

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

apply_migrations_cli() {
  local db_url="$1"
  echo "Fallback: supabase db push via pooler …"
  echo 'Y' | supabase db push --db-url "${db_url}" --include-all --yes
}

apply_migrations_management_api() {
  echo "Applying migrations via Management API (SUPABASE_ACCESS_TOKEN) …"
  SUPABASE_DEV_PROJECT_REF="${PROJECT_REF}" node "${ROOT_DIR}/scripts/push-migrations-management-api.mjs"
}

build_dev_database_url() {
  if [[ -n "${SUPABASE_DEV_DATABASE_URL:-}" ]]; then
    trim_secret "${SUPABASE_DEV_DATABASE_URL}"
    return
  fi

  if [[ -z "${SUPABASE_DEV_DB_PASSWORD:-}" ]]; then
    return 1
  fi

  local password
  password="$(trim_secret "${SUPABASE_DEV_DB_PASSWORD}")"

  PROJECT_REF="${PROJECT_REF}" \
  SUPABASE_DEV_DB_PASSWORD="${password}" \
  POOLER_HOST="${POOLER_HOST}" \
  node <<'NODE'
const ref = process.env.PROJECT_REF;
const password = process.env.SUPABASE_DEV_DB_PASSWORD;
const poolerHost = process.env.POOLER_HOST;
const encodedPassword = encodeURIComponent(password);
process.stdout.write(
  `postgresql://postgres.${ref}:${encodedPassword}@${poolerHost}:5432/postgres`,
);
NODE
}

echo "=== [1/3] Apply database migrations to dev (${PROJECT_REF}) ==="
cd "${ROOT_DIR}"

if ! apply_migrations_management_api; then
  echo "Management API migration apply failed." >&2
  if [[ "${DEV_DB_PUSH_FALLBACK:-}" == "true" ]] && DEV_DATABASE_URL="$(build_dev_database_url 2>/dev/null || true)" && [[ -n "${DEV_DATABASE_URL}" ]]; then
    if ! command -v supabase >/dev/null 2>&1; then
      echo "supabase CLI not found for fallback" >&2
      exit 1
    fi
    apply_migrations_cli "${DEV_DATABASE_URL}" || exit 1
  else
    echo "Dev migrations use SUPABASE_ACCESS_TOKEN only (set DEV_DB_PUSH_FALLBACK=true to try db push)." >&2
    exit 1
  fi
fi

echo "=== [2/3] Deploy edge functions to dev ==="
export SUPABASE_DEV_PROJECT_REF="${PROJECT_REF}"
node "${ROOT_DIR}/scripts/deploy-edge-functions.mjs"

echo "=== [3/3] Sync dev auth platform ==="
"${ROOT_DIR}/scripts/sync-dev-auth-platform.sh" "${PROJECT_REF}"

echo "Dev Supabase release complete for ${PROJECT_REF}."
