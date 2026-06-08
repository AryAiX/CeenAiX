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
MIGRATION_MODE="${AZURE_UAE_MIGRATION_MODE:-supabase}"

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

psql_exec() {
  psql "${DB_URL}" -v ON_ERROR_STOP=1 "$@"
}

psql_migration_applied() {
  local version="$1"
  [[ "$(psql_exec -Atq -c "select 1 from supabase_migrations.schema_migrations where version = '${version}' limit 1;")" == "1" ]]
}

psql_mark_applied() {
  local version="$1" name="$2"
  local escaped_name
  escaped_name="${name//\'/\'\'}"
  psql_exec -c "insert into supabase_migrations.schema_migrations(version, name, statements) values ('${version}', '${escaped_name}', array[]::text[]) on conflict (version) do nothing;"
}

apply_with_psql() {
  local migration_plan
  migration_plan="$(mktemp)"
  trap 'rm -f "${migration_plan}"' RETURN

  psql_exec -c "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[] not null default '{}', name text);"

  python3 - "${ROOT_DIR}" > "${migration_plan}" <<'PYEOF'
import sys
from pathlib import Path

root = Path(sys.argv[1])
demo_versions = set()
for raw_line in (root / "scripts/prod-demo-migrations.txt").read_text().splitlines():
    line = raw_line.split("#", 1)[0].strip()
    if line.isdigit() and len(line) == 14:
        demo_versions.add(line)

repair_versions = {"20260413120000", "20260413120100", "20260413120200"}
# These are listed in the production skip file because they extend demo portal
# data, but on a fresh self-hosted database they also create schema that later
# canonical migrations depend on. Apply them here and rely on prod cleanup below
# to remove their demo rows.
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

  echo "=== [1/4] Mark demo/skipped migrations as applied; apply canonical migrations ==="
  while IFS='|' read -r version name action path; do
    if psql_migration_applied "${version}"; then
      echo "Skipping already-applied migration ${version}_${name}"
      continue
    fi

    if [[ "${action}" == "mark" ]]; then
      echo "Marking migration ${version}_${name} as applied on Azure UAE..."
      psql_mark_applied "${version}" "${name}"
      continue
    fi

    echo "Applying migration ${version}_${name}..."
    psql_exec -f "${path}"
    psql_mark_applied "${version}" "${name}"
  done < "${migration_plan}"

  echo "=== [2/4] Remove demo rows and verify reference data ==="
  psql_exec -f "${ROOT_DIR}/scripts/prod-demo-cleanup.sql"

  echo "Azure UAE migration sync complete."
}

require_cmd node
require_cmd psql

if [[ "${MIGRATION_MODE}" == "psql" ]]; then
  require_cmd python3
  cd "${ROOT_DIR}"
  apply_with_psql
  exit 0
fi

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  require_cmd npx
  SUPABASE_CMD=(npx -y supabase)
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
