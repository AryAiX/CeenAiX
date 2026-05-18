#!/usr/bin/env node
/**
 * Build all Supabase Auth email HTML files from one shared CeenAiX layout.
 * Run before sync-auth-email-templates.sh (or let the sync script call this).
 *
 * Every self-serve role (patient, doctor, pharmacy, lab, insurance) uses the
 * same confirmation email — signup only differs by user_metadata.role.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAuthEmail } from './auth-email/layout.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'supabase', 'templates');

const CONFIRMATION_URL = '{{ .ConfirmationURL }}';

const templates = {
  confirmation: renderAuthEmail({
    pageTitle: 'Confirm your email',
    headline: 'Confirm your email',
    intro:
      'Thanks for creating your CeenAiX account. This message is the same for every role — patient, doctor, pharmacy, lab, and insurance. Tap the button below to verify your email and continue onboarding.',
    cta: { label: 'Confirm email', href: CONFIRMATION_URL },
    linkFallback: CONFIRMATION_URL,
    footerNote: 'If you did not create a CeenAiX account, you can safely ignore this message.',
  }),
  recovery: renderAuthEmail({
    pageTitle: 'Reset your password',
    headline: 'Reset your password',
    intro:
      'We received a request to reset the password for your CeenAiX account. Use the button below to choose a new password.',
    cta: { label: 'Reset password', href: CONFIRMATION_URL },
    linkFallback: CONFIRMATION_URL,
    footerNote: 'If you did not request a password reset, you can safely ignore this message.',
  }),
  magic_link: renderAuthEmail({
    pageTitle: 'Sign in to CeenAiX',
    headline: 'Sign in to CeenAiX',
    intro: 'Use the button below to sign in. This link expires shortly and can only be used once.',
    cta: { label: 'Sign in', href: CONFIRMATION_URL },
    linkFallback: CONFIRMATION_URL,
    footerNote: 'If you did not request this email, you can safely ignore it.',
  }),
  invite: renderAuthEmail({
    pageTitle: 'You are invited to CeenAiX',
    headline: 'You have been invited',
    intro: 'You have been invited to join CeenAiX. Accept the invitation to create your account.',
    cta: { label: 'Accept invitation', href: CONFIRMATION_URL },
    linkFallback: CONFIRMATION_URL,
    footerNote: 'If you were not expecting this invitation, you can safely ignore this message.',
  }),
  email_change: renderAuthEmail({
    pageTitle: 'Confirm email change',
    headline: 'Confirm your new email',
    intro:
      'Confirm that you want to use this email address with your CeenAiX account. If you did not request this change, ignore this message.',
    cta: { label: 'Confirm email change', href: CONFIRMATION_URL },
    linkFallback: CONFIRMATION_URL,
    footerNote: 'If you did not request an email change, you can safely ignore this message.',
  }),
  reauthentication: renderAuthEmail({
    pageTitle: 'Your verification code',
    headline: 'Verification code',
    intro: 'Enter this one-time code to continue with a sensitive action on your CeenAiX account:',
    extraBody: `<p style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#0f172a;text-align:center;">{{ .Token }}</p>`,
    footerNote: 'If you did not start this action, secure your account and contact support.',
  }),
  password_changed_notification: renderAuthEmail({
    pageTitle: 'Password changed',
    headline: 'Your password was changed',
    intro:
      'This is a confirmation that the password for your CeenAiX account was just changed. If you made this change, no further action is needed.',
    footerNote: 'If you did not change your password, contact support immediately.',
  }),
  email_changed_notification: renderAuthEmail({
    pageTitle: 'Email address changed',
    headline: 'Your email address was changed',
    intro:
      'The email address on your CeenAiX account was updated. If you made this change, no further action is needed.',
    footerNote: 'If you did not change your email, contact support immediately.',
  }),
};

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, html] of Object.entries(templates)) {
  const path = join(OUT_DIR, `${name}.html`);
  writeFileSync(path, html, 'utf8');
  console.log(`Wrote ${path}`);
}
