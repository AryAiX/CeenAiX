# Manual Environment Configuration

This runbook tracks platform and environment configuration that is **not stored in code, migrations, or committed project files** and must be enabled manually in each environment.

Use this whenever setting up a new environment such as local, preview, staging, or production.

## What Belongs Here

Include configuration that lives in:

- Supabase project settings
- Vercel project settings
- GitHub repository settings and secrets
- DNS and custom domain providers
- Third-party dashboards used by auth, messaging, or deployment

Do not use this document for:

- source-controlled application code
- SQL migrations in `supabase/migrations/`
- committed environment templates
- product requirements or feature specs

## Current Manual Configuration

| Area | Manual Configuration | Environment(s) | Where It Is Configured | Status | Notes |
|---|---|---|---|---|---|
| Supabase Auth | Enable email auth provider | All envs | Supabase project Auth configuration | done | Already enabled on the current project |
| Supabase Auth | Confirmation email delivery provider / SMTP sender setup | All envs that use email/password signup | Supabase Auth email configuration | done | Resend SMTP: host `smtp.resend.com`, user `resend`, sender `CeenAiX <no-reply@mail.ceenaix.com>`. **Replicate on every Supabase project** (dev `lgfaucsfiyxvmsghnpey` and prod `ziykaxyadcdmyakzvjff`). Resend marketing/branded templates do **not** apply when using Supabase SMTP — Supabase still renders its own HTML from Auth → Email Templates. |
| Supabase Auth | Branded auth email HTML (all auth mailers, all roles) | All envs | `node scripts/build-auth-email-templates.mjs` then `scripts/sync-auth-email-templates.sh` | pending | **One shared layout for every role** (patient, doctor, pharmacy, lab, insurance). Signup only stores `role` in user metadata; Supabase sends the same confirmation template for all. Resend SMTP delivers; Supabase renders HTML from `supabase/templates/`. Sync to **both** dev and prod projects. |
| Supabase Auth | Enable phone OTP auth provider | All envs | Supabase project Auth configuration | done | Enabled on the current project |
| Supabase Auth | Local redirect allow-list | Local, preview | Supabase Auth URL configuration | done | Includes `http://localhost:5173/**`, `http://127.0.0.1:5173/**`, `https://*.vercel.app/**` |
| Supabase Auth | Development test OTP mapping | Local/dev only | Supabase Auth configuration | done | Previously used on the current project for development validation; removed after Twilio Verify was configured for real SMS delivery |
| Supabase Auth | Real SMS provider credentials | Staging, production | Supabase Auth SMS provider settings | done | Current project is configured with Twilio Verify for real phone OTP delivery; replicate credentials per environment through secure secrets management |
| Twilio Admin | Account recovery code custody | Shared ops ownership | Company password manager / secure vault | pending | Store Twilio recovery codes in a secure vault only; never commit recovery codes, auth tokens, or backup codes to the repository |
| Supabase Auth | Site URL for auth emails and redirects | Staging, production | Supabase Auth URL configuration | pending | **Prod** (`ceenaix-prod` / `ziykaxyadcdmyakzvjff`): set `site_url` to `https://www.ceenaix.com`. Dev can stay on `http://localhost:5173`. The sync script accepts `--site-url` to PATCH this via Management API. |
| Supabase Auth | Redirect URL allow-list for final domains | Preview, staging, production | Supabase Auth URL configuration | pending | Add exact custom-domain URLs and any approved preview URLs |
| Supabase Edge Functions | Deploy AI Edge Functions used by the current app surface | Each Supabase env | Supabase CLI / Supabase dashboard | done | Current project has both `ai-chat` and `ai-document-analyze` deployed with platform JWT verification disabled so browser CORS preflights succeed; both functions handle auth requirements in-function as needed. Any environment running patient AI chat or doctor PDF-to-questionnaire extraction must deploy the same function set after code changes. |
| Supabase Edge Functions | Set Edge Function AI secrets | All envs that use AI features | Supabase project secrets | done | Current project has `OPENAI_API_KEY` configured. This key is consumed by Supabase Edge Functions, not by the Vercel frontend project. Replicate required secrets in every environment before deploying `ai-chat` or `ai-document-analyze`. |
| Vercel | Project creation and linking | Each deployed env | Vercel dashboard / Vercel CLI | done | Current project is linked to `aryaix/ceenaix` |
| Vercel | Frontend environment variables | Each deployed env | Vercel project environment settings | done | Current app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; compatibility duplicates `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are also present in the current Vercel project. Do not paste values with literal `\n` characters; that caused a production blank-page incident until the env vars were re-saved and redeployed. |
| Vercel | Custom domain connection | Production | Vercel Domains settings + DNS provider | done | `ceenaix.com` and `www.ceenaix.com` are connected to the current Vercel project. This does not replace the separate Supabase auth `site_url` and redirect allow-list work. |
| GitHub Actions | Deploy secrets for Vercel | Repo / env specific | GitHub repository secrets | done | Includes `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, and Vercel auth token secret(s) |
| GitHub Actions | Build secrets for Supabase client env vars | Repo / env specific | GitHub repository secrets | done | Current repo still has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets for CI-side build validation, but production deploys must not override Vercel's pulled environment values with them. Keep them aligned if retained. |

## Environment Setup Checklist

### Supabase

For each Supabase project:

1. Enable email auth
2. Configure auth email delivery (SMTP/provider, sender identity, templates if customized)
   - **SMTP (Resend):** host `smtp.resend.com`, username `resend`, password from `docs/keys.local.md`, sender name `CeenAiX`, from `no-reply@mail.ceenaix.com`. Disable link tracking for auth mail.
   - **Templates:** paste HTML from `supabase/templates/` into Dashboard → Authentication → Email Templates, **or** run:
     ```bash
     export SUPABASE_ACCESS_TOKEN="..."  # dashboard account token
     ./scripts/sync-auth-email-templates.sh ziykaxyadcdmyakzvjff --site-url https://www.ceenaix.com
     ./scripts/sync-auth-email-templates.sh lgfaucsfiyxvmsghnpey --site-url http://localhost:5173
     ```
3. Enable phone auth if OTP login is required
4. Configure allowed redirect URLs for the environment
5. Set the correct `site_url`
   Current project value is still `http://localhost:5173`; replace it in each preview, staging, and production environment with that environment's real app URL.
6. For development-only testing, optionally configure a test OTP mapping
7. For production OTP, configure a real SMS provider

### Supabase Edge Functions

For each Supabase project:

1. Deploy `ai-chat`
2. Deploy `ai-document-analyze`
   Current project deploys both with platform JWT verification disabled (`--no-verify-jwt`) so browser preflight requests are not rejected before the function handles CORS/auth logic.
3. Confirm all required function secrets are present before deploy
   Current project requires at least `OPENAI_API_KEY`, plus the standard Supabase function environment values automatically provided by the platform.
4. Re-deploy these functions whenever their source changes, even if there are no new SQL migrations

### Vercel

For each Vercel environment:

1. Create or link the Vercel project
2. Set all required frontend environment variables
   Current app runtime requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The current Vercel project also keeps `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` aligned for compatibility. Twilio, SMTP sender, and `OPENAI_API_KEY` are not frontend Vercel vars for this app.
   When entering Vercel values, ensure they do not contain literal escaped newlines such as `\n`; malformed Supabase env values caused the production site to render a blank page until they were corrected and production was redeployed.
3. Verify the production and preview build commands
4. Connect the custom domain when the environment is ready

### GitHub Actions

For each repository or deployment target:

1. Add all required Vercel secrets
2. Add all required Supabase frontend env-var secrets
   Current production deploys should use Vercel project environment variables as the source of truth after `vercel pull`. Do not inject stale GitHub copies of `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` into the production release build step, or a valid Vercel configuration can be overwritten during deploy.
3. Verify `main` production deploy and pull request preview deploy both succeed

## Production Readiness Items Still Manual

These items are still not complete for a production-grade auth rollout:

- Replicate the Twilio Verify configuration in each deployed environment as needed
- Configure reliable auth email delivery for signup confirmation and password reset emails
- Keep `ai-chat` and `ai-document-analyze` deployed in every environment that uses patient AI chat or doctor pre-visit PDF extraction, with the same JWT verification settings used by the current project
- Store Twilio admin recovery codes in a secure vault outside the repository
- Update Supabase `site_url` from `http://localhost:5173` to the final custom domain
- Add final custom-domain redirect URLs to the Supabase allow-list
- Remove the temporary development OTP mapping

## Related Files

- `CHECKLIST.md`
- `docs/agent/mvp-scope.md`
- `docs/specs/08-technical-architecture.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
