#!/usr/bin/env bash
# Deploy the Azure UAE web bundle and Edge Function source to the self-hosted VM.
#
# Required env:
#   AZURE_UAE_HOST              VM public IP or DNS name
#   AZURE_UAE_SSH_KEY_PATH      Path to the private SSH key
#
# Optional env:
#   AZURE_UAE_USER              SSH user (default azureuser)
#   AZURE_UAE_SSH_PORT          SSH port (default 22)
#   AZURE_UAE_WEB_ROOT          Remote static web root (default /var/www/ceenaix)
#   AZURE_UAE_STACK_DIR         Remote Supabase stack dir (default /opt/supabase)
#
# Before running, build the app with the target Azure env vars:
#   VITE_SUPABASE_URL=http://<public-ip> \
#   VITE_SUPABASE_ANON_KEY=<anon> \
#   VITE_SUPABASE_FUNCTIONS_URL=http://<public-ip>/functions/v1 \
#     npm run build

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${AZURE_UAE_HOST:-}"
USER_NAME="${AZURE_UAE_USER:-azureuser}"
SSH_KEY_PATH="${AZURE_UAE_SSH_KEY_PATH:-}"
SSH_PORT="${AZURE_UAE_SSH_PORT:-22}"
WEB_ROOT="${AZURE_UAE_WEB_ROOT:-/var/www/ceenaix}"
STACK_DIR="${AZURE_UAE_STACK_DIR:-/opt/supabase}"
REMOTE_TMP="/tmp/ceenaix-azure-uae-deploy"

if [[ -z "${HOST}" ]]; then
  echo "Missing required env: AZURE_UAE_HOST" >&2
  exit 1
fi

if [[ -z "${SSH_KEY_PATH}" ]]; then
  echo "Missing required env: AZURE_UAE_SSH_KEY_PATH" >&2
  exit 1
fi

if [[ ! -d "${ROOT_DIR}/dist" ]]; then
  echo "Missing dist/. Run npm run build with Azure UAE env vars first." >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd node
require_cmd tar
require_cmd ssh
require_cmd scp

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

web_archive="${tmp_dir}/web.tgz"
functions_archive="${tmp_dir}/functions.tgz"
function_file_list="${tmp_dir}/function-files.txt"

COPYFILE_DISABLE=1 tar -C "${ROOT_DIR}/dist" -czf "${web_archive}" .

node <<'NODE' > "${function_file_list}"
const { readFileSync } = require('node:fs');
const manifest = JSON.parse(readFileSync('scripts/non-migration-deployables.manifest.json', 'utf8'));
for (const deployable of manifest.deployables ?? []) {
  if (deployable.type === 'supabase-edge-function') {
    console.log(deployable.path);
  }
}
NODE

COPYFILE_DISABLE=1 tar -C "${ROOT_DIR}" -czf "${functions_archive}" -T "${function_file_list}"

ssh_base=(
  -i "${SSH_KEY_PATH}"
  -p "${SSH_PORT}"
  -o StrictHostKeyChecking=accept-new
)
scp_base=(
  -i "${SSH_KEY_PATH}"
  -P "${SSH_PORT}"
  -o StrictHostKeyChecking=accept-new
)
remote="${USER_NAME}@${HOST}"

echo "Uploading web and Edge Function artifacts to ${remote}..."
ssh "${ssh_base[@]}" "${remote}" "mkdir -p '${REMOTE_TMP}'"
scp "${scp_base[@]}" "${web_archive}" "${remote}:${REMOTE_TMP}/web.tgz"
scp "${scp_base[@]}" "${functions_archive}" "${remote}:${REMOTE_TMP}/functions.tgz"

echo "Installing artifacts on ${remote}..."
ssh "${ssh_base[@]}" "${remote}" \
  "WEB_ROOT='${WEB_ROOT}' STACK_DIR='${STACK_DIR}' REMOTE_TMP='${REMOTE_TMP}' bash -s" <<'REMOTE'
set -euo pipefail

sudo mkdir -p "${WEB_ROOT}" "${STACK_DIR}/volumes/functions"
sudo rm -rf "${WEB_ROOT:?}/"*
sudo tar -xzf "${REMOTE_TMP}/web.tgz" -C "${WEB_ROOT}"

functions_tmp="${REMOTE_TMP}/functions"
rm -rf "${functions_tmp}"
mkdir -p "${functions_tmp}"
tar -xzf "${REMOTE_TMP}/functions.tgz" -C "${functions_tmp}"
sudo cp -R "${functions_tmp}/supabase/functions/." "${STACK_DIR}/volumes/functions/"

if command -v docker >/dev/null 2>&1 && [[ -f "${STACK_DIR}/docker-compose.yml" ]]; then
  cd "${STACK_DIR}"
  services="$(sudo docker compose -f docker-compose.yml -f docker-compose.override.yml ps --services 2>/dev/null || true)"
  if printf '%s\n' "${services}" | grep -qx 'functions'; then
    sudo docker compose -f docker-compose.yml -f docker-compose.override.yml restart functions
  elif printf '%s\n' "${services}" | grep -qx 'edge-runtime'; then
    sudo docker compose -f docker-compose.yml -f docker-compose.override.yml restart edge-runtime
  fi
  if printf '%s\n' "${services}" | grep -qx 'caddy'; then
    sudo docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile || \
      sudo docker compose -f docker-compose.yml -f docker-compose.override.yml restart caddy
  fi
fi

rm -rf "${REMOTE_TMP}"
REMOTE

echo "Azure UAE VM deploy complete."
