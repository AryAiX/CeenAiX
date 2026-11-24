#!/usr/bin/env bash
# Full Supabase production sync: project state, schema, reference-data hygiene,
# edge functions, auth platform.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN
#
# Project restore, migrations, demo cleanup, and verify use the Management API.
# Optional emergency bypass when Supabase database endpoints are unavailable:
#   SKIP_PROD_MIGRATION_CHECK=true
# Optional direct Postgres fallback when the Management API database endpoints fail:
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
POOLER_HOSTS="${PROD_POOLER_HOSTS:-${POOLER_HOST}}"
DIRECT_DATABASE_URL=""
DIRECT_DATABASE_URL_CHECKED=false

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
  SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}" \
  SUPABASE_SKIP_DEMO_MIGRATIONS=true \
    node "${ROOT_DIR}/scripts/push-migrations-management-api.mjs"
}

build_prod_database_urls() {
  if [[ -n "${SUPABASE_PROD_DATABASE_URL:-}" ]]; then
    trim_secret "${SUPABASE_PROD_DATABASE_URL}"
    printf '\n'
    return
  fi

  if [[ -z "${SUPABASE_PROD_DB_PASSWORD:-}" ]]; then
    return 1
  fi

  local password
  password="$(trim_secret "${SUPABASE_PROD_DB_PASSWORD}")"

  PROJECT_REF="${PROJECT_REF}" \
  SUPABASE_PROD_DB_PASSWORD="${password}" \
  POOLER_HOSTS="${POOLER_HOSTS}" \
  node <<'NODE'
const ref = process.env.PROJECT_REF;
const password = process.env.SUPABASE_PROD_DB_PASSWORD;
const poolerHosts = (process.env.POOLER_HOSTS ?? '')
  .split(/\s+/)
  .map((host) => host.trim())
  .filter(Boolean);
const encodedPassword = encodeURIComponent(password);
for (const poolerHost of poolerHosts) {
  process.stdout.write(
    `postgresql://postgres.${ref}:${encodedPassword}@${poolerHost}:5432/postgres?sslmode=require\n`,
  );
}
NODE
}

select_direct_database_url() {
  if [[ "${DIRECT_DATABASE_URL_CHECKED}" == "true" ]]; then
    [[ -n "${DIRECT_DATABASE_URL}" ]]
    return
  fi

  DIRECT_DATABASE_URL_CHECKED=true

  if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required for direct Postgres fallback but was not found" >&2
    return 1
  fi

  local candidate
  while IFS= read -r candidate; do
    [[ -n "${candidate}" ]] || continue
    if psql "${candidate}" -v ON_ERROR_STOP=1 -qAt -c 'select 1' >/dev/null 2>&1; then
      DIRECT_DATABASE_URL="${candidate}"
      return 0
    fi
  done < <(build_prod_database_urls 2>/dev/null || true)

  return 1
}

run_sql_management_api() {
  local sql_file="$1"
  # QA-109: pass the ref explicitly. run-sql-management-api.mjs no longer falls back to
  # SUPABASE_PROD_PROJECT_REF on its own, so production has to be named here.
  SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}" \
    node "${ROOT_DIR}/scripts/run-sql-management-api.mjs" "${sql_file}" \
      --project-ref "${PROJECT_REF}"
}

psql_exec() {
  psql "${DIRECT_DATABASE_URL}" -v ON_ERROR_STOP=1 "$@"
}

psql_migration_applied() {
  local version="$1"
  [[ "$(psql_exec -Atq -c "select 1 from supabase_migrations.schema_migrations where version = '${version}' limit 1;")" == "1" ]]
}

psql_mark_applied() {
  local version="$1" name="$2"
  local escaped_name
  escaped_name="${name//\'/\'\'}"
  psql_exec -q -c "insert into supabase_migrations.schema_migrations(version, name, statements) values ('${version}', '${escaped_name}', array[]::text[]) on conflict (version) do nothing;"
}

apply_migrations_direct_db() {
  if ! select_direct_database_url; then
    echo "Direct Postgres fallback could not connect with SUPABASE_PROD_DATABASE_URL or SUPABASE_PROD_DB_PASSWORD." >&2
    echo "Update the GitHub secret SUPABASE_PROD_DB_PASSWORD from the Supabase production database password, then rerun Release." >&2
    return 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required for direct migration fallback but was not found" >&2
    return 1
  fi

  local migration_plan
  migration_plan="$(mktemp)"
  trap 'rm -f "${migration_plan}"' RETURN

  psql_exec -q -c "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[] not null default '{}', name text);"

  python3 - "${ROOT_DIR}" > "${migration_plan}" <<'PYEOF'
import sys
from pathlib import Path

root = Path(sys.argv[1])
demo_versions = set()
for raw_line in (root / "scripts/prod-demo-migrations.txt").read_text().splitlines():
    version = raw_line.split("#", 1)[0].strip()
    if version.isdigit() and len(version) == 14:
        demo_versions.add(version)

repair_versions = {"20260413120000", "20260413120100", "20260413120200"}
schema_required_seed_versions = {"20260504000000", "20260510000000"}
skip_versions = (demo_versions | repair_versions) - schema_required_seed_versions

for path in sorted((root / "supabase/migrations").glob("*.sql")):
    version, _, rest = path.name.partition("_")
    if not (version.isdigit() and len(version) == 14):
        continue
    name = rest.removesuffix(".sql")
    action = "mark" if version in skip_versions else "apply"
    print("|".join([version, name, action, str(path)]))
PYEOF

  echo "Fallback: applying production-safe migrations via direct Postgres connection …"
  while IFS='|' read -r version name action path; do
    if psql_migration_applied "${version}"; then
      echo "Skipping already-applied migration ${version}_${name}"
      continue
    fi

    if [[ "${action}" == "mark" ]]; then
      echo "Marking production-skipped migration ${version}_${name} as applied."
      psql_mark_applied "${version}" "${name}"
      continue
    fi

    echo "Applying migration ${version}_${name}."
    psql_exec -q -f "${path}"
    psql_mark_applied "${version}" "${name}"
  done < "${migration_plan}"
}

run_sql_direct_db() {
  local sql_file="$1"

  if ! select_direct_database_url; then
    echo "Direct Postgres fallback could not connect with SUPABASE_PROD_DATABASE_URL or SUPABASE_PROD_DB_PASSWORD." >&2
    echo "Update the GitHub secret SUPABASE_PROD_DB_PASSWORD from the Supabase production database password, then rerun Release." >&2
    return 1
  fi

  echo "Fallback: running $(basename "${sql_file}") via direct Postgres connection …"
  psql "${DIRECT_DATABASE_URL}" -v ON_ERROR_STOP=1 --file "${sql_file}" >/dev/null
}

run_sql_with_direct_fallback() {
  local description="$1"
  local sql_file="$2"

  if run_sql_management_api "${sql_file}"; then
    return 0
  fi

  echo "${description} via Management API failed; trying direct Postgres fallback." >&2
  run_sql_direct_db "${sql_file}"
}

skip_prod_database_management_api() {
  [[ "${SKIP_PROD_MIGRATION_CHECK:-}" == "true" ]]
}

echo "=== [1/6] Ensure Supabase project is active (${PROJECT_REF}) ==="
cd "${ROOT_DIR}"
SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}" \
  node "${ROOT_DIR}/scripts/ensure-supabase-project-active.mjs"

echo "=== [2/6] Apply database migrations to ${PROJECT_REF} ==="

if skip_prod_database_management_api; then
  echo "::warning::Emergency database sync bypass enabled (SKIP_PROD_MIGRATION_CHECK=true). Production migrations, demo cleanup, and reference-data verification are not run by this release. Edge Functions and auth sync still run and fail normally."
elif ! apply_migrations_management_api; then
  echo "Management API migration apply failed." >&2
  apply_migrations_direct_db || exit 1
fi

echo "=== [3/6] Remove demo rows (idempotent) ==="
if skip_prod_database_management_api; then
  echo "::warning::Emergency database sync bypass enabled; production demo cleanup skipped."
else
  run_sql_with_direct_fallback "Production demo cleanup" "${ROOT_DIR}/scripts/prod-demo-cleanup.sql"
fi

echo "=== [4/6] Verify reference data ==="
if skip_prod_database_management_api; then
  echo "::warning::Emergency database sync bypass enabled; production reference-data verification skipped."
else
  run_sql_with_direct_fallback "Production reference-data verification" "${ROOT_DIR}/scripts/prod-release-verify.sql"
fi

echo "=== [5/6] Deploy edge functions ==="
export SUPABASE_PROD_PROJECT_REF="${PROJECT_REF}"
node "${ROOT_DIR}/scripts/deploy-edge-functions.mjs"

echo "=== [6/6] Sync auth platform (templates, site URL, redirects) ==="
"${ROOT_DIR}/scripts/sync-prod-auth-platform.sh" "${PROJECT_REF}"

echo "Supabase production release complete for ${PROJECT_REF}."
