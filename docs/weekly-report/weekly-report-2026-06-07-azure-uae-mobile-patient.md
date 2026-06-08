# Weekly Report — Azure UAE Public-IP Pilot & Mobile Patient App Foundation

Date: 2026-06-07  
Project: CeenAiX  
Scope: Azure UAE North self-host pilot for Supabase OSS + CeenAiX web app, production Release workflow repair, and the start of the React Native patient mobile app  
Branches: PR **#74** mobile foundation, PR **#75** Azure UAE self-host environment, PR **#76** Release workflow Azure target, PR **#77** Release reliability / retry work, plus direct `main` release-fix commits where needed
Prior week: [Weekly Report — AI Consultation Recorder (Recorded + Live), Clinic Portal, Landing Page & Azure UAE Analysis (2026-05-31)](../report/weekly-report-2026-05-31-ai-recorder-clinics-landing.md)

## Executive Summary

| Metric | This week | Prior week (2026-05-31) |
|--------|-----------|--------------------------|
| **Headline achievements** | **Azure UAE deployment / public-IP pilot** and **React Native patient mobile app started** | AI Recorder, Clinic Portal, Landing Page, Azure UAE migration analysis |
| **Production infrastructure** | Self-hosted Supabase OSS + CeenAiX web app on Azure UAE North VM at **http://20.74.136.137** | Azure UAE North recommended as the migration path |
| **Release pipeline** | Normal end-to-end production Release succeeded after Azure target and retry repairs | Edge Functions registered for release |
| **Mobile surface** | Expo React Native patient app foundation with auth/session, tabs, Dashboard/Appointments/Profile | Web/PWA patient portal only |
| **Key PRs** | #74, #75, #76, #77 | #58-#68 |

This week converted last week's Azure UAE recommendation into a working **public-IP pilot**: CeenAiX now has a self-hosted Supabase OSS stack and the web app running on an **Azure UAE North VM** at **http://20.74.136.137**. Migrations were applied, Edge Functions were deployed, auth sync was handled, and the Release workflow was repaired so the deployment path runs end-to-end instead of remaining a manual infrastructure experiment.

The second major achievement was starting the **mobile patient version**. PR **#74** established an Expo / React Native app with docs and checklist first, then added auth/session handling, a bottom-tab shell, and a real-data vertical slice for Dashboard, Appointments, and Profile against Supabase.

The normal production **Release** action is now green: [run 27112222111](https://github.com/AryAiX/CeenAiX-10895ac7/actions/runs/27112222111) completed Supabase migrations, cleanup/verification, Edge Function deployment, auth sync, and Vercel deploy successfully.

## Azure UAE Public-IP Pilot (PR #75)

This was the largest platform milestone of the week: moving from analysis to a running UAE-hosted pilot.

- Provisioned an **Azure UAE North VM** and brought up a self-hosted **Supabase OSS** environment for the app's core backend services.
- Deployed the CeenAiX web app shell to the same public-IP pilot at **http://20.74.136.137**.
- Applied Supabase migrations against the Azure-hosted database and verified the API surface after cleanup.
- Deployed the repo-managed Edge Functions needed by the current app, keeping AI and server-side workflows behind the Supabase function layer.
- Verified the health of the auth and REST surfaces through Supabase GoTrue health and PostgREST OpenAPI responses.

The business impact is that CeenAiX now has a concrete UAE-hosted deployment path for data-residency discussions. It is still a pilot, but it proves the recommended self-host Supabase OSS approach can run in Azure UAE North without rewriting the product.

## Release Workflow Azure Target (PRs #76, #77)

The Release workflow was updated and hardened so Azure UAE is part of a repeatable deployment path rather than a one-off VM setup.

- PR **#76** added the Azure target into the production Release flow.
- PR **#77** improved Release reliability, including retry behavior around steps that had been brittle during deployment.
- Direct `main` release-fix commits were used where useful to get production Release green without waiting on another large branch.
- The successful production run completed the full chain: Supabase migrations, migration cleanup / verification, Edge Function deploy, auth sync, and Vercel deploy.

This matters because infrastructure readiness is now represented in CI/CD, not only in local runbooks or manual operator knowledge.

## React Native Patient Mobile App (PR #74)

The mobile patient product started with a docs/checklist-first foundation and a narrow working slice.

- Created the Expo / React Native project foundation on the mobile branch / PR **#74**.
- Added auth and session handling against Supabase so the app starts from the same identity model as the web product.
- Built a bottom-tab patient shell for the initial mobile navigation model.
- Implemented a first vertical slice for **Dashboard**, **Appointments**, and **Profile** using real Supabase data instead of static mock-only screens.
- Kept the initial scope patient-focused, matching the product priority of getting the patient mobile journey moving before broadening to every portal.

The app is not yet a full replacement for the web patient portal, but the important foundation is in place: native navigation, session state, and live patient data are working together.

## CI / Platform Delivery

| Change | PR / Run | Detail |
|--------|----------|--------|
| Mobile patient foundation | #74 | Expo app, docs/checklist-first setup, Supabase auth/session, bottom-tab shell, Dashboard/Appointments/Profile live-data slice |
| Azure UAE self-host environment | #75 | Azure UAE North VM, self-hosted Supabase OSS, web app shell at `http://20.74.136.137`, migrations and Edge Functions applied |
| Release workflow Azure target | #76 | Production Release flow updated for the Azure-backed environment |
| Release reliability / retries | #77 | Hardened brittle release steps so normal Release can complete end-to-end |
| Production Release success | [run 27112222111](https://github.com/AryAiX/CeenAiX-10895ac7/actions/runs/27112222111) | Supabase migrations, cleanup/verification, Edge Functions, auth sync, and Vercel deploy all succeeded |

## Implementation Notes

- Azure remains a **public-IP pilot**, not the final production network posture. It proves the deployment architecture, but DNS, TLS, SSH hardening, backups, and managed secrets still need production treatment.
- The self-host path preserves the current Supabase-native architecture: Postgres, GoTrue, PostgREST, Storage, and Edge Functions stay aligned with the existing frontend contract.
- The Release workflow is now the source of truth for normal production deployment steps, reducing manual drift between Vercel, Supabase, and the Azure target.
- The mobile app deliberately began with a small patient slice rather than a broad placeholder app; that makes future screens easier to add against proven auth/session/data patterns.

## Verification

```text
Production Release
passed — https://github.com/AryAiX/CeenAiX-10895ac7/actions/runs/27112222111

Release run completed
passed — Supabase migrations
passed — Supabase migration cleanup / verification
passed — Edge Functions deploy
passed — auth sync
passed — Vercel deploy

Azure health checks
passed — Supabase GoTrue health
passed — PostgREST OpenAPI response
passed — CeenAiX web app shell at http://20.74.136.137

Mobile PR validation
passed — mobile typecheck
passed — web lint / typecheck / build checks reported with the mobile foundation work
```

## Residual Notes

- **Azure DNS / TLS:** public-IP access is useful for the pilot, but production should move behind DNS and TLS before wider stakeholder use.
- **Azure access hardening:** SSH should be restricted, ideally via Bastion or equivalent controlled access, before treating the VM as production infrastructure.
- **Azure operations:** backups, restore drills, monitoring, reservation purchase, and upgrade ownership still need to be finalized for the self-hosted stack.
- **Secrets / integrations:** SMTP and OpenAI secrets should be configured through the production secret-management path; no secrets are recorded in this report.
- **Reference data:** `lab_test_catalog` reference rows may need verification or reseeding in Azure if catalog-backed lab ordering is exercised there.
- **Mobile scope:** more patient portal screens remain placeholders or not yet implemented; earlier native simulator smoke was done, but full physical-device QA and app-store readiness are still pending.
