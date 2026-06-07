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
#   START_STACK           "true" to run `docker compose up -d` (default true)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/supabase}"
SUPABASE_REF="${SUPABASE_REF:-master}"
API_EXTERNAL_URL="${API_EXTERNAL_URL:-https://api.uae.ceenaix.com}"
SITE_URL="${SITE_URL:-https://uae.ceenaix.com}"
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
    git clone --depth 1 --branch "${SUPABASE_REF}" --filter=blob:none --sparse \
      https://github.com/supabase/supabase "${STACK_DIR}.src"
    git -C "${STACK_DIR}.src" sparse-checkout set docker
    cp -r "${STACK_DIR}.src/docker/." "${STACK_DIR}/"
    rm -rf "${STACK_DIR}.src"
  fi
}

# ── 3. Drop in CeenAiX overrides ─────────────────────────────────────────────
install_overrides() {
  [[ -d "${INFRA_DIR}" ]] || die "Cannot find infra templates at ${INFRA_DIR}. Set INFRA_DIR."
  log "Installing CeenAiX overrides from ${INFRA_DIR}…"
  cp "${INFRA_DIR}/docker-compose.override.yml" "${STACK_DIR}/docker-compose.override.yml"
  cp "${INFRA_DIR}/Caddyfile" "${STACK_DIR}/Caddyfile"
}

# ── 4. Generate secrets into .env (first run only) ───────────────────────────
generate_env() {
  local env_file="${STACK_DIR}/.env"
  if [[ -f "${env_file}" ]] && ! grep -q '__CHANGE_ME' "${env_file}"; then
    log ".env already present and filled in — leaving it untouched."
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

# ── 5. Bring up the stack ────────────────────────────────────────────────────
start_stack() {
  if [[ "${START_STACK}" != "true" ]]; then
    log "START_STACK=${START_STACK} — skipping 'docker compose up'."
    return
  fi
  log "Pulling images and starting the stack…"
  ( cd "${STACK_DIR}" && \
    docker compose -f docker-compose.yml -f docker-compose.override.yml pull && \
    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d )
  log "Stack is up. Check: cd ${STACK_DIR} && docker compose ps"
}

main() {
  require_cmd openssl || die "openssl is required."
  require_cmd python3 || die "python3 is required (used for safe .env templating)."
  install_docker
  fetch_supabase
  install_overrides
  generate_env
  start_stack
  log "Done. Next: apply migrations + deploy Edge Functions per the runbook."
}

main "$@"
