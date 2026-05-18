#!/usr/bin/env bash
# Sync production auth: branded email templates + site_url + redirect allow-list (+ optional SMTP).
#
# Usage:
#   ./scripts/sync-prod-auth-platform.sh [project-ref]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/prod-platform-config.env"

PROJECT_REF="${1:-${SUPABASE_PROD_PROJECT_REF:-ziykaxyadcdmyakzvjff}}"
TEMPLATES_DIR="${ROOT_DIR}/supabase/templates"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is not set" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  echo "node and jq are required" >&2
  exit 1
fi

echo "Building auth email templates from shared layout..."
node "${ROOT_DIR}/scripts/build-auth-email-templates.mjs"

read_template() {
  jq -Rs '.' < "${TEMPLATES_DIR}/$1"
}

build_auth_payload() {
  jq -n \
    --arg site_url "${PROD_SITE_URL}" \
    --arg uri_allow_list "${PROD_URI_ALLOW_LIST}" \
    --arg smtp_pass "${SUPABASE_RESEND_SMTP_PASSWORD:-}" \
    --argjson confirmation_content "$(read_template confirmation.html)" \
    --argjson recovery_content "$(read_template recovery.html)" \
    --argjson magic_link_content "$(read_template magic_link.html)" \
    --argjson invite_content "$(read_template invite.html)" \
    --argjson email_change_content "$(read_template email_change.html)" \
    --argjson reauthentication_content "$(read_template reauthentication.html)" \
    --argjson password_changed_content "$(read_template password_changed_notification.html)" \
    --argjson email_changed_content "$(read_template email_changed_notification.html)" \
    '{
      site_url: $site_url,
      uri_allow_list: $uri_allow_list,
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
    | if $smtp_pass != "" then . + {
        external_email_enabled: true,
        smtp_host: "smtp.resend.com",
        smtp_port: 587,
        smtp_user: "resend",
        smtp_pass: $smtp_pass,
        smtp_admin_email: "no-reply@mail.ceenaix.com",
        smtp_sender_name: "CeenAiX"
      } else . end'
}

PAYLOAD="$(build_auth_payload)"

echo "PATCH auth config on ${PROJECT_REF} (site_url, redirects, all role-shared templates)..."
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

if [[ -n "${SUPABASE_RESEND_SMTP_PASSWORD:-}" ]]; then
  echo "Resend SMTP settings applied from SUPABASE_RESEND_SMTP_PASSWORD."
else
  echo "SMTP password not in env; skipped smtp_* patch (ensure Resend SMTP is set in dashboard)."
fi

CONFIRM_PREVIEW="$(
  curl -sS "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    | jq -r '.mailer_templates_confirmation_content[0:80] // "missing"'
)"

if [[ "${CONFIRM_PREVIEW}" == *"CeenAiX"* ]]; then
  echo "Verified: confirmation template contains CeenAiX branding."
else
  echo "Warning: confirmation template may not include branding. Preview: ${CONFIRM_PREVIEW}" >&2
fi
