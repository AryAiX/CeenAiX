#!/usr/bin/env bash
# Sync CeenAiX branded Supabase Auth email templates to a hosted project via the Management API.
#
# All self-serve roles (patient, doctor, pharmacy, lab, insurance) share these templates.
# Resend SMTP delivers every auth email; Supabase renders the shared HTML below.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN  Personal access token from https://supabase.com/dashboard/account/tokens
#
# Usage:
#   ./scripts/sync-auth-email-templates.sh <project-ref> [--site-url https://www.ceenaix.com]
#
# Examples:
#   ./scripts/sync-auth-email-templates.sh lgfaucsfiyxvmsghnpey --site-url http://localhost:5173
#   ./scripts/sync-auth-email-templates.sh ziykaxyadcdmyakzvjff --site-url https://www.ceenaix.com

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="${ROOT_DIR}/supabase/templates"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is not set" >&2
  exit 1
fi

PROJECT_REF="${1:-}"
if [[ -z "${PROJECT_REF}" ]]; then
  echo "Usage: $0 <project-ref> [--site-url URL]" >&2
  exit 1
fi
shift || true

SITE_URL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --site-url)
      SITE_URL="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

echo "Building shared auth email templates..."
node "${ROOT_DIR}/scripts/build-auth-email-templates.mjs"

read_template() {
  local file="${TEMPLATES_DIR}/$1"
  if [[ ! -f "${file}" ]]; then
    echo "Missing template file: ${file}" >&2
    exit 1
  fi
  jq -Rs '.' < "${file}"
}

# shellcheck disable=SC2034
build_payload() {
  jq -n \
    --arg site_url "${SITE_URL}" \
    --argjson confirmation_content "$(read_template confirmation.html)" \
    --argjson recovery_content "$(read_template recovery.html)" \
    --argjson magic_link_content "$(read_template magic_link.html)" \
    --argjson invite_content "$(read_template invite.html)" \
    --argjson email_change_content "$(read_template email_change.html)" \
    --argjson reauthentication_content "$(read_template reauthentication.html)" \
    --argjson password_changed_content "$(read_template password_changed_notification.html)" \
    --argjson email_changed_content "$(read_template email_changed_notification.html)" \
    '{
      mailer_subjects_confirmation: "Confirm your CeenAiX account",
      mailer_subjects_recovery: "Reset your CeenAiX password",
      mailer_subjects_magic_link: "Your CeenAiX sign-in link",
      mailer_subjects_invite: "You are invited to CeenAiX",
      mailer_subjects_email_change: "Confirm your CeenAiX email change",
      mailer_subjects_reauthentication: "Your CeenAiX verification code",
      mailer_subjects_password_changed_notification: "Your CeenAiX password was changed",
      mailer_subjects_email_changed_notification: "Your CeenAiX email was changed",
      mailer_templates_confirmation_content: $confirmation_content,
      mailer_templates_recovery_content: $recovery_content,
      mailer_templates_magic_link_content: $magic_link_content,
      mailer_templates_invite_content: $invite_content,
      mailer_templates_email_change_content: $email_change_content,
      mailer_templates_reauthentication_content: $reauthentication_content,
      mailer_templates_password_changed_notification_content: $password_changed_content,
      mailer_templates_email_changed_notification_content: $email_changed_content
    }
    | if $site_url != "" then . + { site_url: $site_url } else . end'
}

PAYLOAD="$(build_payload)"

echo "Updating auth email templates for project ${PROJECT_REF} (all roles, shared branding)..."
if [[ -n "${SITE_URL}" ]]; then
  echo "  site_url -> ${SITE_URL}"
fi

HTTP_CODE="$(
  curl -sS -o /tmp/supabase-auth-config-response.json -w '%{http_code}' \
    -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}"
)"

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "Management API returned HTTP ${HTTP_CODE}" >&2
  cat /tmp/supabase-auth-config-response.json >&2
  exit 1
fi

echo "Done. Test signup for any role (patient, doctor, pharmacy, lab, insurance) on this project."
