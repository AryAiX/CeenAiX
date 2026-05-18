#!/usr/bin/env bash
# Dev Supabase sync: schema, edge functions, auth platform (keeps demo seed data).
#
# Required env:
#   SUPABASE_ACCESS_TOKEN
#
# Database (one of):
#   SUPABASE_DEV_DATABASE_URL  full URL (password must be percent-encoded if set manually)
#   SUPABASE_DEV_DB_PASSWORD   builds postgresql://postgres:***@db.<ref>.supabase.co:5432/postgres
#
# Optional:
#   SUPABASE_DEV_PROJECT_REF   (default lgfaucsfiyxvmsghnpey)
#   SUPABASE_RESEND_SMTP_PASSWORD

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="${SUPABASE_DEV_PROJECT_REF:-lgfaucsfiyxvmsghnpey}"

require_env() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing required env: $1" >&2
    exit 1
  fi
}

require_env SUPABASE_ACCESS_TOKEN

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found" >&2
  exit 1
fi

build_dev_database_url() {
  if [[ -n "${SUPABASE_DEV_DATABASE_URL:-}" ]]; then
    echo "${SUPABASE_DEV_DATABASE_URL}"
    return
  fi

  require_env SUPABASE_DEV_DB_PASSWORD

  PROJECT_REF="${PROJECT_REF}" SUPABASE_DEV_DB_PASSWORD="${SUPABASE_DEV_DB_PASSWORD}" node <<'NODE'
const ref = process.env.PROJECT_REF;
const password = process.env.SUPABASE_DEV_DB_PASSWORD;
const encodedPassword = encodeURIComponent(password);
process.stdout.write(
  `postgresql://postgres:${encodedPassword}@db.${ref}.supabase.co:5432/postgres`,
);
NODE
}

DEV_DATABASE_URL="$(build_dev_database_url)"

echo "=== [1/3] Apply database migrations to dev (${PROJECT_REF}) ==="
cd "${ROOT_DIR}"
echo "Using direct DB host db.${PROJECT_REF}.supabase.co:5432"
echo 'Y' | supabase db push --db-url "${DEV_DATABASE_URL}" --include-all --yes

echo "=== [2/3] Deploy edge functions to dev ==="
export SUPABASE_DEV_PROJECT_REF="${PROJECT_REF}"
node "${ROOT_DIR}/scripts/deploy-edge-functions.mjs"

echo "=== [3/3] Sync dev auth platform ==="
"${ROOT_DIR}/scripts/sync-dev-auth-platform.sh" "${PROJECT_REF}"

echo "Dev Supabase release complete for ${PROJECT_REF}."
