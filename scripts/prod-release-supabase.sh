#!/usr/bin/env bash
# Full Supabase production sync: schema, reference-data hygiene, edge functions, auth platform.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN
#   SUPABASE_PROD_PROJECT_REF  (default ziykaxyadcdmyakzvjff)
#   SUPABASE_PROD_DB_PASSWORD
#
# Optional env (apply Resend SMTP when set — password never committed):
#   SUPABASE_RESEND_SMTP_PASSWORD
#
# Usage:
#   ./scripts/prod-release-supabase.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/prod-platform-config.env"

PROJECT_REF="${SUPABASE_PROD_PROJECT_REF:-ziykaxyadcdmyakzvjff}"

require_env() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing required env: $1" >&2
    exit 1
  fi
}

require_env SUPABASE_ACCESS_TOKEN
require_env SUPABASE_PROD_DB_PASSWORD

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

echo "=== [1/5] Apply database migrations to ${PROJECT_REF} ==="
cd "${ROOT_DIR}"
if command -v supabase >/dev/null 2>&1; then
  supabase link --project-ref "${PROJECT_REF}" --password "${SUPABASE_PROD_DB_PASSWORD}"
  echo 'Y' | supabase db push --linked --include-all --password "${SUPABASE_PROD_DB_PASSWORD}"
  echo "=== [2/5] Remove demo rows (idempotent) ==="
  supabase db query --linked --file scripts/prod-demo-cleanup.sql --output csv
  echo "=== [3/5] Verify reference data ==="
  supabase db query --linked --file scripts/prod-release-verify.sql --output csv
else
  echo "supabase CLI not found; skipping migrations (CI should install CLI)" >&2
  exit 1
fi

echo "=== [4/5] Deploy edge functions ==="
export SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}"
node "${ROOT_DIR}/scripts/deploy-edge-functions.mjs"

echo "=== [5/5] Sync auth platform (templates, site URL, redirects) ==="
"${ROOT_DIR}/scripts/sync-prod-auth-platform.sh" "${PROJECT_REF}"

echo "Supabase production release complete for ${PROJECT_REF}."
