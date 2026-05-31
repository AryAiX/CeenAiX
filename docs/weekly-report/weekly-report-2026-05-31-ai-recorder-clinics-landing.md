# Weekly Report — AI Consultation Recorder (Recorded + Live), Clinic Portal, Landing Page & Azure UAE Analysis

Date: 2026-05-31  
Project: CeenAiX  
Scope: AI Consultation Recorder (recorded **and** live modes), Clinic Portal + Super Admin clinics onboarding & doctor invites, new public Landing Page + marketing leads capture, and an infrastructure analysis of the AWS UAE outage / Azure UAE migration question  
Branches: `cursor/ai-consultation-recording-77a1`, `cursor/ai-scribe-live-mode-77a1`, `cursor/clinic-portal-3d22`, `cursor/admin-clinics-invites-3d22`, `landing-page` / `cursor/landing-page-fixes-3d22`, plus dev fix branches → `main` (PRs **#58–#68**)
Prior week: [Weekly Report — Interactive Clinical, Multi-Actor E2E & Prod Release (2026-05-24)](weekly-report-2026-05-24-interactive-clinical-multi-actor-e2e.md)

## Executive Summary

| Metric | This week | Prior week (2026-05-24) |
|--------|-----------|--------------------------|
| **Headline features** | AI Recorder (recorded + live), Clinic Portal, Super Admin Clinics, Landing Page | 400-fix sprints + multi-actor E2E |
| **New Edge Functions** | **3** (`consultation-scribe`, `clinic-doctor-invite`, `leads`) | 0 |
| **New portals / surfaces** | Clinic Portal (11 routes), Admin Clinics, public Landing + Privacy | — |
| **E2E tests (total)** | **273** | 206 |
| New E2E spec files | `clinic-portal.spec.ts` (45), `ai-scribe.spec.ts` (3, incl. live) | `interactive-clinical.spec.ts`, `multi-actor-scenarios.spec.ts` |
| Unit tests (Vitest) | **81** | 70 |

This week shipped the flagship **AI Consultation Recorder ("AI Scribe")** for the Doctor Portal in two modes — **recorded** (capture → transcribe → SOAP) and **live** (near-real-time transcript + AI copilot cues) — plus a full **Clinic Portal** with RBAC and bilingual UI, **Super Admin clinic onboarding with doctor invite emails**, and a production-ready public **Landing Page** with compliant marketing-leads capture. We also completed an **infrastructure analysis** of migrating off AWS UAE (down since the March 2026 drone-strike damage) toward Azure UAE North.

All work landed with `npm run typecheck`, `npm run lint`, `npm run build`, Vitest, and the Playwright E2E suite green. The recording schema, RLS, private audio bucket, and `consultation-scribe` Edge Function were verified live on the **dev** Supabase project.

## AI Consultation Recorder — recorded + live (PRs #65, #68)

The central deliverable. Lives inside the Consultation Workspace (`/doctor/appointments/:appointmentId`) as a persistent recording control bar plus an **AI Scribe** tab; nothing is a standalone page.

**Recommended capture hardware (doctor + patient, dual-channel):** [DJI Mic Mini — 2 TX + 1 RX](https://www.amazon.com/gp/aw/d/B0DDL8WGH5/?_encoding=UTF8&pd_rd_plhdr=t&aaxitk=8832b9cc0da0c4fb582991da62236871&hsa_cr_id=0&qid=1780251887&sr=1-2-9e67e56a-6f64-441f-a281-df67fc737124&ref_=sbx_s_sparkle_sbtcd_asin_1_bkgd&pd_rd_w=TTR37&content-id=amzn1.sym.2fb72bc8-96ef-420d-b08f-c04b69f36507%3Aamzn1.sym.2fb72bc8-96ef-420d-b08f-c04b69f36507&pf_rd_p=2fb72bc8-96ef-420d-b08f-c04b69f36507&pf_rd_r=Z0FD2BNYXH2AV8ABV3NQ&pd_rd_wg=y3HbZ&pd_rd_r=d401ff70-2b45-4d76-a8e8-52784df5b7eb) — two clip-on transmitters into one USB-C receiver; in **Stereo (S)** mode it presents the doctor and patient as two separate channels, which is the basis for the planned deterministic doctor↔patient separation.

### Data model (PR #65 — `20260531150000_consultation_recordings.sql`)

Five new tables + enums + a private encrypted Storage bucket, all RLS-scoped:

- `consultation_recordings` — appointment/doctor/patient/clinic, audio path, duration, language, `status` (`recording` → `processing` → `ready` → `approved` / `discarded`), and `mode` (`recorded` | `live`, added in PR #68 via `20260531180000_consultation_recording_mode.sql`).
- `consultation_transcripts` — `full_text` + `segments` JSONB (`{speaker, start_ms, end_ms, text, confidence}`).
- `ai_clinical_notes` — chief complaint, SOAP S/O/A/P, plus structured `symptoms` / `medications` / `diagnoses` (with ICD-10) / `follow_up` / `education_points`, model + prompt template, `approved_by` / `approved_at`.
- `consultation_consent_log` — append-only; consent method (verbal / signed), informed + verbal flags, optional signature image.
- `consultation_recordings_audit` — append-only; every event (started / stopped / discarded / transcribed / note_generated / note_approved) with actor + IP.

RLS: the treating doctor (`doctor_id = auth.uid()`) manages rows; the patient can read their own; `super_admin` can read. Consent and audit tables are insert/select only. Audio lives in the private `consultation-audio` bucket (`{doctor_id}/{appointment_id}/…`, signed URLs only, no download button).

### Edge Function `consultation-scribe`

Single doctor-authorized function, all AI server-side (existing `OPENAI_API_KEY`):

- `transcribe` — Whisper (`whisper-1`) full-file pass.
- `generate_note` — GPT-4o (JSON mode) SOAP + structured fields; ICD-10 only when confident; supports re-generation with prompt template (General / Pediatric / Cardiology / Brief), output language (EN/AR), custom instructions, or an edited transcript.
- `suggestions` — smart actions (orders / meds / allergies) that deep-link and pre-fill the existing Prescriptions / Lab Orders / Patient pages.
- `live_transcribe_chunk` — multipart Whisper pass on a single live audio segment.
- `live_cues` — GPT-4o copilot returning concise cues (follow-up **questions**, **red-flag/safety** alerts, history **reminders**) from the running transcript + patient history.

### Recorded mode (PR #65)

Consent modal (two required confirmations + optional signature) → record with a floating control bar (timer, pulse, waveform, pause/resume, mic selection, `🔴 Recording — [Patient]` tab title, refresh-leave warning) → Stop & Process uploads audio, runs Whisper, then GPT-4o → AI Scribe tab shows an editable SOAP note (with "AI-generated" badges), the transcript, and smart suggestions → **Apply to SOAP** / **Approve & Save to Record** commits to the encounter with an "Approved by … on …" footer.

### Live mode (PR #68)

A **Record / Live** toggle in the control bar. Because Whisper is batch-only, live mode records the shared stream in ~7s self-contained segments and transcribes each as it closes, streaming text into a **Live Session panel**; an **AI copilot** polls every ~18s with the running transcript + patient history and surfaces dismissible cues. On Stop, the streamed transcript is persisted and used directly to generate the SOAP note (no second Whisper pass).

### Diarization status

Single-mic live shows best-effort, relabelable speaker tags — Whisper cannot truly separate speakers. Precise doctor↔patient attribution is designed to arrive via the **dual-mic channel split** (Left = Doctor / Right = Patient) using the hardware above, which needs no AI diarization; the data model and UI already accommodate it.

### Hooks, UI, i18n, tests

- Hooks: `useAudioRecorder`, `useLiveTranscription` (segmented recorder), `useConsultationScribe`, `useConsultationScribeController`.
- Components: `RecordingControlBar`, `ConsentModal` (+ `SignaturePad`), `AiScribePanel`, `TranscriptPanel`, `SmartSuggestions`, `WaveformVisualizer`, `LiveSessionPanel`.
- Full EN/AR i18n under `doctor.consultationScribe.*` (also fixed an AR key-placement bug where the block was nested under `doctor.patientDetail` and silently fell back to English).
- `consultation-scribe` registered in the prod deploy manifest. Verified on dev: 5 tables present, RLS enabled, `consultation-audio` bucket private with 3 storage policies, function **ACTIVE**, no new security-advisor findings.

## Clinic Portal (PR #63)

A production-oriented Clinic Portal on the **canonical schema**, superseding the earlier mock-only prototype (#60).

- **Architecture on canonical tables:** clinics → `public.facilities` (extended with bilingual + branding fields); clinic users → `public.clinic_portal_members` (`clinic_admin` / `clinic_manager` / `clinic_receptionist`); doctor↔clinic link → `public.facility_staff` (extended with fees, schedule, invitation status); plus `facility_services`, `facility_doctor_pricing_overrides`, and `clinic_pricing_audit_log`.
- New `clinic` value on `user_role`; RLS scoped by `current_user_clinic_facility_id()` helpers. RPCs: `get_clinic_portal_snapshot()`, `clinic_invite_doctor(...)`, `log_clinic_pricing_change(...)`.
- **11 routes** with RBAC: `/clinic/dashboard`, `/doctors` (+ `/:staffId` detail with clinic-managed pricing), `/appointments`, `/patients`, `/services`, `/pricing` (defaults + per-doctor matrix + audit), `/schedule`, `/analytics`, `/billing` (clinic_admin only), `/settings`.
- Doctor portal integration: clinic affiliation in the header and read-only "Managed by your clinic" fee fields on Profile for `clinic_managed_pricing` doctors.
- EN/AR i18n under `clinic.*`; demo tenant **Al Noor Family Clinic** (`clinic1@aryaix.com`).

## Super Admin Clinics onboarding + doctor invites (PR #64)

- **`/admin/clinics`** — clinics directory, onboard clinic, link existing doctors, and view a clinic's doctors; router, nav, hooks, types, EN/AR i18n.
- New **`clinic-doctor-invite`** Edge Function using Supabase Auth `inviteUserByEmail`; invitations carry `email_sent_at` / `last_email_error`; doctor onboarding claims pending invitations via `claim_clinic_doctor_invitation()`.
- Admin clinic RPCs: `admin_onboard_clinic`, `admin_link_doctor_to_clinic`, `admin_list_clinics`, `admin_get_clinic_doctors`, `admin_list_unlinked_doctors`.
- Fixed `ClinicPageLayout` so the clinic portal no longer renders the pharmacy `OpsShell` chrome (was hiding page actions like "Add doctor" and the `<main>` landmark).
- **45 E2E tests** in `clinic-portal.spec.ts` + 10 clinic routes in `role-journeys`, covering route/RBAC/cross-portal/isolation/auth; E2E mock hub extended with clinic roles, fixtures, RPC + Edge mocks.

Supporting dev fixes: **PR #66** bootstraps `public.facilities` so clinic-portal migrations apply cleanly on dev (the canonical `facilities` table had drifted out of dev), and **PR #67** repairs the `clinic1@aryaix.com` demo password on dev.

## Landing Page + marketing leads (PRs #59, #62)

- **PR #59** added the Bolt landing design; **PR #62** hardened it to production:
  - Backend: `20260531120000_marketing_leads.sql` — `marketing_launch_signups`, `marketing_demo_requests`, service-role-only insert RLS, and a `marketing_leads_public_count()` RPC; new public **`leads`** Edge Function (`POST /demo-request`, `POST /launch-notify`, `GET /count`) with a honeypot field + work-email validation; registered in the deploy manifest.
  - Frontend: shared `src/lib/marketing-leads.ts` client; de-duplicated hero/section forms into a single canonical `#demo-launch` section; restored `home.landing.prelaunch.*` i18n (EN/AR); fixed logo asset; replaced inflated "50,000+ patients" claims with honest pre-launch metrics; added a `/privacy` route + bilingual `PrivacyPolicy` page.

## Infrastructure Analysis — AWS UAE outage & Azure UAE migration

**Context.** The AWS UAE region (`me-central-1`) has been down since March 2026 drone-strike damage; **Azure UAE North** is operational. However, **Supabase Cloud has no UAE region** (it runs only in fixed AWS US/EU/APAC regions), so "migrate to Azure" became a real question for data residency.

**Core finding.** CeenAiX is a **Supabase-native** app, not just "Postgres with an API." Migration difficulty splits into two very different paths:

### Path A — Self-host Supabase OSS on Azure (recommended)

- Run the same open-source stack (Postgres, PostgREST, GoTrue, Storage, Deno Edge Runtime) on **Azure Container Apps/AKS + Azure Database for PostgreSQL**, ideally in **Azure UAE North** for residency.
- API contracts stay identical → **app code ~95% untouched**, including all 4 (now more) Edge Functions.
- Difficulty: **moderate, mostly DevOps** (we own backups / HA / upgrades). Only env vars, one hardcoded Functions URL, and CI/CD scripts change.

### Path B — Re-platform onto Azure-native PaaS (hard; avoid unless mandated)

A multi-surface rewrite dominated by:

- **~370 PostgREST `.from()` query sites** across ~69 files / 37 hooks — Azure has no PostgREST equivalent.
- **Auth + RLS → Entra/AD B2C:** rewrite `auth-context.tsx` (~13 GoTrue calls), ~30+ `auth.users` FKs, and hundreds of `auth.uid()` / `auth.jwt()` policies.
- **Deno Edge Functions → Azure Functions** (the original 4 were ~2,550 LOC; the count has since grown).
- **Storage (3 buckets) → Azure Blob;** tooling/mocks rewrite.

**Eases migration either way:** no Realtime, pgvector, pg_cron, Vault, or DB webhooks are in use; auth is centralized; SQL logic is mostly standard Postgres.

**Recommendation.** For escaping AWS / gaining UAE residency, go **Path A**. A viable middle option is keeping self-hosted PostgREST + Postgres (preserves the 370 query sites) and swapping only **auth + Edge Functions** to Azure-native.

> Note for the AI Recorder specifically: live transcription and SOAP generation currently call OpenAI (US/EU). UAE data-residency for audio/transcripts is a separate compliance decision from the database region and applies under either path.

## CI / Platform Delivery

| Change | PR | Detail |
|--------|-----|--------|
| AI Consultation Recording — recorded mode | #65 | 5 tables + RLS + private bucket; `consultation-scribe` (transcribe / generate_note / suggestions); control bar, consent, AI Scribe tab; EN/AR; manifest entry |
| AI Scribe — live mode | #68 | `live_transcribe_chunk` + `live_cues` tasks; segmented Whisper; Live Session panel + copilot cues; `mode` column |
| Clinic Portal | #63 | Canonical `facilities` / `facility_staff` + clinic tables; `clinic` role; 11 RBAC routes; `get_clinic_portal_snapshot` / `clinic_invite_doctor` / `log_clinic_pricing_change` |
| Super Admin Clinics + invites | #64 | `/admin/clinics`; `clinic-doctor-invite` Edge Function; admin clinic RPCs; 45 clinic E2E tests |
| Clinic facilities bootstrap (dev) | #66 | Bootstrap `public.facilities` so clinic migrations apply on dev |
| Clinic demo password repair (dev) | #67 | Restore `clinic1@aryaix.com` demo credentials |
| Landing page (Bolt design) | #59 | Initial hosted landing design |
| Landing hardening | #62 | `leads` Edge Function + marketing tables; DRY forms; EN/AR; `/privacy`; honest pre-launch stats |
| Pharmacy ↔ doctor connection + fixes | #58 / #61 | Doctor→pharmacy prescription routing; RLS + `assign_prescription_pharmacy` RPC; forward migrations |

## Implementation Notes

- AI Recorder uses the existing `OPENAI_API_KEY` (Whisper + GPT-4o) — **no new vendor or key**. The decision to stay on Whisper (vs adding Deepgram/Azure streaming with native diarization) was explicit; the trade-off is that single-mic live diarization is best-effort until dual-mic capture lands.
- New Edge Functions (`consultation-scribe`, `clinic-doctor-invite`, `leads`) are registered in `scripts/non-migration-deployables.manifest.json` and ship via the Release pipeline; they must be **deployed/redeployed** after merge.
- Recording, clinic, marketing, and `mode` migrations are idempotent where applied to dev out-of-band; verified on the dev Supabase project (`lgfaucsfiyxvmsghnpey`).
- E2E mocks for the new surfaces live in `e2e/support/supabase-mock.ts` and `e2e/support/scribe-mock.ts`; live mic flows are exercised with a Chromium fake media device.

## Verification

```text
npm run typecheck
passed

npm run lint
passed

npm run build
passed

npm run test  (Vitest)
81 passed

npm run test:e2e
273 tests (incl. ai-scribe recorded + live, clinic-portal)
```

## Residual Notes

- **Diarization (AI Recorder):** single-mic live shows approximate speaker labels; deterministic doctor↔patient separation is the planned **dual-mic channel-split** follow-up (Left = Doctor / Right = Patient) using the recommended DJI Mic Mini.
- **Audio retention / residency:** live and recorded audio currently go to OpenAI for transcription; UAE residency for audio + transcripts is a compliance decision tracked alongside the Azure analysis. A configurable retention purge (default 90-day audio) is not yet implemented.
- **Edge Function deploy:** `consultation-scribe` (live tasks), `clinic-doctor-invite`, and `leads` must be deployed to dev/prod for the new flows to run end-to-end.
- **Azure migration:** Path A (self-host Supabase OSS on Azure UAE North) is recommended; no code-level migration work has started — this week was analysis only.
- **Manual clinic checks pending:** Super Admin onboard clinic + invite doctor email, and doctor accepting an invite, still need a staging manual pass (mocked in E2E).
