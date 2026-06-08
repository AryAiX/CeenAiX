#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CeenAiX — Azure UAE self-hosted Supabase bootstrap.
#
# Idempotent, safe-to-re-run provisioning for a SINGLE Azure VM (Ubuntu 22.04/
# 24.04 LTS) in Azure UAE North that runs the official Supabase docker stack
# behind Caddy. Mirrors the step-by-step in docs/runbooks/azure-uae-environment.md.
#
# It does NOT provision Azure resources (create the VM/NSG/DNS first) and is
# designed to be COPIED ONTO THE VM and run there as a sudo-capable user:
#
#   scp -r infra/azure-uae scripts/azure-uae-bootstrap.sh azureuser@<vm-ip>:~/
#   ssh azureuser@<vm-ip>
#   ./azure-uae-bootstrap.sh
#
# Re-running is safe: it skips Docker install if present, never clobbers an
# existing .env, and `docker compose up -d` reconciles to the desired state.
#
# Steps:
#   1. Install Docker Engine + compose plugin (idempotent).
#   2. Clone/refresh the official supabase/docker compose into $STACK_DIR.
#   3. Drop in CeenAiX overrides (docker-compose.override.yml, Caddyfile).
#   4. Generate secrets into .env on first run (JWT secret + signed ANON/
#      SERVICE_ROLE JWTs, DB/dashboard passwords). Never overwrites.
#   5. Bring the stack up.
#
# Environment knobs (all optional; sensible defaults):
#   STACK_DIR             default /opt/supabase
#   SUPABASE_REF          git ref/branch of supabase/supabase (default master)
#   API_EXTERNAL_URL      public API URL (default https://api.uae.ceenaix.com)
#   SITE_URL              web app origin (default https://uae.ceenaix.com)
#   INFRA_DIR             path to this repo's infra/azure-uae (default: alongside script)
#   WEB_ROOT              static web root mounted into Caddy (default /var/www/ceenaix)
#   START_STACK           "true" to run `docker compose up -d` (default true)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/supabase}"
SUPABASE_REF="${SUPABASE_REF:-master}"
API_EXTERNAL_URL="${API_EXTERNAL_URL:-https://api.uae.ceenaix.com}"
SITE_URL="${SITE_URL:-https://uae.ceenaix.com}"
WEB_ROOT="${WEB_ROOT:-/var/www/ceenaix}"
START_STACK="${START_STACK:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Where this repo's templates live. When the script is copied next to the
# infra/azure-uae folder (the scp example above), this resolves correctly.
INFRA_DIR="${INFRA_DIR:-${SCRIPT_DIR}/azure-uae}"
if [[ ! -d "${INFRA_DIR}" && -d "${SCRIPT_DIR}/../infra/azure-uae" ]]; then
  INFRA_DIR="$(cd "${SCRIPT_DIR}/../infra/azure-uae" && pwd)"
fi

log()  { printf '\033[1;36m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bootstrap]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[bootstrap]\033[0m %s\n' "$*" >&2; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1; }

docker_compose() {
  if docker info >/dev/null 2>&1; then
    docker compose "$@"
  else
    sudo docker compose "$@"
  fi
}

env_has_filled_key() {
  local env_file="$1" key="$2" value
  value="$(python3 - "${env_file}" "${key}" <<'PYEOF'
import sys
path, key = sys.argv[1], sys.argv[2]
for line in open(path):
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1].strip())
        break
PYEOF
)"
  [[ -n "${value}" && "${value}" != __CHANGE_ME* ]]
}

# ── base64url helper ─────────────────────────────────────────────────────────
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# ── HS256 JWT signer (ANON_KEY / SERVICE_ROLE_KEY are JWTs signed w/ JWT_SECRET)
sign_jwt() {
  local role="$1" secret="$2" now exp header payload signing_input sig
  now="$(date +%s)"
  exp="$(( now + 60 * 60 * 24 * 365 * 10 ))" # 10-year expiry, like Supabase Cloud
  header="$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)"
  payload="$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$now" "$exp" | b64url)"
  signing_input="${header}.${payload}"
  sig="$(printf '%s' "$signing_input" | openssl dgst -binary -sha256 -hmac "$secret" | b64url)"
  printf '%s.%s' "$signing_input" "$sig"
}

gen_secret() { openssl rand -hex "${1:-32}"; }
gen_password() { openssl rand -base64 24 | tr -d '+/=' | head -c 28; }

# ── 1. Docker ────────────────────────────────────────────────────────────────
install_docker() {
  if require_cmd docker && docker compose version >/dev/null 2>&1; then
    log "Docker + compose already installed — skipping."
    return
  fi
  log "Installing Docker Engine + compose plugin…"
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg git
  sudo install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${codename} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER" || true
  log "Docker installed. You may need to re-login for the docker group to apply."
}

# ── 2. Fetch the official supabase/docker compose ────────────────────────────
fetch_supabase() {
  sudo mkdir -p "${STACK_DIR}"
  sudo chown "$USER":"$USER" "${STACK_DIR}"
  if [[ -d "${STACK_DIR}/.git" ]]; then
    log "Refreshing existing supabase checkout in ${STACK_DIR}…"
    git -C "${STACK_DIR}" fetch --depth 1 origin "${SUPABASE_REF}"
    git -C "${STACK_DIR}" checkout -q "${SUPABASE_REF}"
    git -C "${STACK_DIR}" reset -q --hard "origin/${SUPABASE_REF}" 2>/dev/null || true
  else
    log "Cloning supabase/supabase (sparse: docker/) into ${STACK_DIR}…"
    local src_dir
    src_dir="$(mktemp -d)"
    git clone --depth 1 --branch "${SUPABASE_REF}" --filter=blob:none --sparse \
      https://github.com/supabase/supabase "${src_dir}"
    git -C "${src_dir}" sparse-checkout set docker
    cp -r "${src_dir}/docker/." "${STACK_DIR}/"
    rm -rf "${src_dir}"
  fi
}

# ── 3. Drop in CeenAiX overrides ─────────────────────────────────────────────
install_overrides() {
  [[ -d "${INFRA_DIR}" ]] || die "Cannot find infra templates at ${INFRA_DIR}. Set INFRA_DIR."
  log "Installing CeenAiX overrides from ${INFRA_DIR}…"
  cp "${INFRA_DIR}/docker-compose.override.yml" "${STACK_DIR}/docker-compose.override.yml"
  cp "${INFRA_DIR}/Caddyfile" "${STACK_DIR}/Caddyfile"
}

install_web_root() {
  log "Preparing web root at ${WEB_ROOT}…"
  sudo mkdir -p "${WEB_ROOT}"
  if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
    sudo tee "${WEB_ROOT}/index.html" >/dev/null <<'HTMLEOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CeenAiX Azure UAE</title>
  </head>
  <body>
    <h1>CeenAiX Azure UAE environment is online</h1>
    <p>The production web bundle has not been deployed yet.</p>
  </body>
</html>
HTMLEOF
  fi
}

# ── 4. Generate secrets into .env (first run only) ───────────────────────────
generate_env() {
  local env_file="${STACK_DIR}/.env"
  if [[ -f "${env_file}" ]] && \
     env_has_filled_key "${env_file}" "JWT_SECRET" && \
     env_has_filled_key "${env_file}" "POSTGRES_PASSWORD" && \
     env_has_filled_key "${env_file}" "ANON_KEY" && \
     env_has_filled_key "${env_file}" "SERVICE_ROLE_KEY"; then
    log ".env already has initialized database/JWT secrets — leaving them untouched."
    return
  fi

  log "Generating fresh secrets into ${env_file}…"
  cp "${INFRA_DIR}/.env.example" "${env_file}"
  chmod 600 "${env_file}"

  local jwt_secret postgres_pw dashboard_pw secret_key_base vault_key anon_key service_key
  jwt_secret="$(gen_secret 48)"
  postgres_pw="$(gen_password)"
  dashboard_pw="$(gen_password)"
  secret_key_base="$(gen_secret 32)"
  vault_key="$(gen_secret 16)"
  anon_key="$(sign_jwt anon "${jwt_secret}")"
  service_key="$(sign_jwt service_role "${jwt_secret}")"

  # Portable in-place replacement (avoids sed -i portability issues).
  python3 - "${env_file}" <<PYEOF
import sys
path = sys.argv[1]
subs = {
    "JWT_SECRET": "${jwt_secret}",
    "POSTGRES_PASSWORD": "${postgres_pw}",
    "DASHBOARD_PASSWORD": "${dashboard_pw}",
    "SECRET_KEY_BASE": "${secret_key_base}",
    "VAULT_ENC_KEY": "${vault_key}",
    "ANON_KEY": "${anon_key}",
    "SERVICE_ROLE_KEY": "${service_key}",
    "API_EXTERNAL_URL": "${API_EXTERNAL_URL}",
    "SUPABASE_PUBLIC_URL": "${API_EXTERNAL_URL}",
    "SITE_URL": "${SITE_URL}",
    "ADDITIONAL_REDIRECT_URLS": "${SITE_URL},ceenaix://auth-callback",
}
out = []
for line in open(path):
    key = line.split("=", 1)[0].strip() if "=" in line else None
    if key in subs:
        out.append(f"{key}={subs.pop(key)}\n")
    else:
        out.append(line)
open(path, "w").writelines(out)
PYEOF

  log "Secrets written. The ANON_KEY (publishable) the apps must use is:"
  printf '\n  VITE_SUPABASE_URL=%s\n  VITE_SUPABASE_ANON_KEY=%s\n\n' "${API_EXTERNAL_URL}" "${anon_key}"
  warn "SERVICE_ROLE_KEY is server-side only. Set SMTP_PASS + OPENAI (function secret) manually."
}

ensure_env_defaults() {
  local env_file="${STACK_DIR}/.env"
  [[ -f "${env_file}" ]] || die "Missing ${env_file}; generate_env must run first."

  log "Ensuring required Supabase docker defaults are present…"
  local publishable_key secret_key pg_meta_key s3_key_id s3_key_secret
  publishable_key="sb_publishable_$(gen_secret 24)"
  secret_key="sb_secret_$(gen_secret 32)"
  pg_meta_key="$(gen_secret 32)"
  s3_key_id="$(gen_secret 16)"
  s3_key_secret="$(gen_secret 32)"

  python3 - "${env_file}" "${publishable_key}" "${secret_key}" "${pg_meta_key}" "${s3_key_id}" "${s3_key_secret}" <<'PYEOF'
import sys
from pathlib import Path

path = Path(sys.argv[1])
generated_publishable_key, generated_secret_key, generated_pg_meta_key, generated_s3_key_id, generated_s3_key_secret = sys.argv[2:7]
lines = path.read_text().splitlines()
values = {}

for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    values[key.strip()] = value.strip()

defaults = {
    "SUPABASE_PUBLISHABLE_KEY": generated_publishable_key,
    "SUPABASE_SECRET_KEY": generated_secret_key,
    "PG_META_CRYPTO_KEY": values.get("VAULT_ENC_KEY") or generated_pg_meta_key,
    "PGRST_DB_SCHEMAS": "public,storage,graphql_public",
    "POOLER_PROXY_PORT_TRANSACTION": "6543",
    "POOLER_MAX_CLIENT_CONN": "100",
    "POOLER_TENANT_ID": "ceenaix-uae",
    "POOLER_DEFAULT_POOL_SIZE": "20",
    "POOLER_DB_POOL_SIZE": "5",
    "GLOBAL_S3_BUCKET": "stub",
    "STORAGE_TENANT_ID": "stub",
    "S3_PROTOCOL_ACCESS_KEY_ID": generated_s3_key_id,
    "S3_PROTOCOL_ACCESS_KEY_SECRET": generated_s3_key_secret,
    "REGION": "local",
    "ENABLE_ANONYMOUS_USERS": "false",
    "IMGPROXY_AUTO_WEBP": "true",
}

existing_keys = set()
out = []
for line in lines:
    if "=" not in line or line.lstrip().startswith("#"):
        out.append(line)
        continue
    key, value = line.split("=", 1)
    stripped_key = key.strip()
    stripped_value = value.strip()
    existing_keys.add(stripped_key)
    duplicates_legacy_key = (
        stripped_key == "SUPABASE_PUBLISHABLE_KEY" and stripped_value == values.get("ANON_KEY")
    ) or (
        stripped_key == "SUPABASE_SECRET_KEY" and stripped_value == values.get("SERVICE_ROLE_KEY")
    )
    if stripped_key in defaults and (not stripped_value or stripped_value.startswith("__CHANGE_ME") or duplicates_legacy_key):
        out.append(f"{stripped_key}={defaults[stripped_key]}")
    else:
        out.append(line)

missing = [key for key in defaults if key not in existing_keys]
if missing:
    out.append("")
    out.append("# Required by the current upstream Supabase docker compose.")
    for key in missing:
        out.append(f"{key}={defaults[key]}")

path.write_text("\n".join(out) + "\n")
PYEOF
}

# ── 5. Bring up the stack ────────────────────────────────────────────────────
start_stack() {
  if [[ "${START_STACK}" != "true" ]]; then
    log "START_STACK=${START_STACK} — skipping 'docker compose up'."
    return
  fi
  log "Pulling images and starting the stack…"
  ( cd "${STACK_DIR}" && \
    docker_compose -f docker-compose.yml -f docker-compose.override.yml pull && \
    docker_compose -f docker-compose.yml -f docker-compose.override.yml up -d )
  if ( cd "${STACK_DIR}" && docker_compose -f docker-compose.yml -f docker-compose.override.yml ps --services 2>/dev/null | grep -qx 'caddy' ); then
    ( cd "${STACK_DIR}" && \
      docker_compose -f docker-compose.yml -f docker-compose.override.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile || \
      docker_compose -f docker-compose.yml -f docker-compose.override.yml restart caddy )
  fi
  log "Stack is up. Check: cd ${STACK_DIR} && docker compose ps"
}

main() {
  require_cmd openssl || die "openssl is required."
  require_cmd python3 || die "python3 is required (used for safe .env templating)."
  install_docker
  fetch_supabase
  install_overrides
  install_web_root
  generate_env
  ensure_env_defaults
  start_stack
  log "Done. Next: apply migrations + deploy Edge Functions per the runbook."
}

main "$@"
