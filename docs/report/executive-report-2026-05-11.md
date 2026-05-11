# Executive Report

Date: 2026-05-11
Project: CeenAiX
Scope: Week-2 of the May parity sprint — Lab & Radiology hosted-parity wrap-up, full Admin and Insurance portal hosted-parity rewrites, in-app organization onboarding, registration autofill hardening, broad Playwright E2E coverage, and a 120-bug audit closure
Reference: [Development Checklist](../../CHECKLIST.md)
DHA Reference: [DHA Integration Checklist](../../DHA_INTEGRATION_CHECKLIST.md)
Companion: [Weekly Report — E2E Scenario Test Coverage (2026-05-11)](../weekly-report/weekly-report-2026-05-11-e2e-scenario-tests.md)

## Executive Summary

For the week ending 2026-05-11, CeenAiX closed **120 categorized bug fixes** on the long-running `bugs` audit branch — covering localization (hard-coded English → `t()` keys + Arabic copy), timezone bugs in date pickers and ICS invites, `NaN` / divide-by-zero defenses, nullish-coalescing corrections, and the onboarding redirect loop — across all ten functional areas of the codebase.

In parallel, the platform now has its first **Playwright end-to-end suite** (PRs #33, #36) with **124 passing browser tests**, including **23 stateful cross-role scenario tests** (admin onboards lab → patient books → doctor orders → lab processes → patient sees result) and explicit negative-case coverage (missing required data, invalid email, missing reason, incomplete lab release, role-denied access). The full suite is documented in the [companion weekly report](../weekly-report/weekly-report-2026-05-11-e2e-scenario-tests.md).

On top of that QA foundation, six PRs brought the last three hosted-parity portals to demo-credible: the **Admin Platform Portal** rewrite (PR #32 — new shell + shared primitives + 11 new tables + 5 SECURITY-DEFINER RPCs + 5 typed hooks), the **Insurance Operator Portal** rewrite across all nine tabs (PR #34, no schema change), and the **Lab & Radiology wrap-up** (PR #31 — `EquipmentCard` department-specific layouts, decimal-hour TAT, sidebar facility/footer/badge fixes, three inbox seed rows). The **admin onboarding round-trip** (PR #35) wired previously-inert header buttons (Analytics, CSV Export, Add Doctor / Register Patient / Onboard Insurer) and added an in-app `OnboardOrganizationModal` backed by a new `admin_create_organization` RPC so super-admins can create hospitals, clinics, labs, pharmacies, and insurance tenants without leaving `/admin/*`; the Register page's Full Name input was also hardened against browser autofill.

All six operational portals — patient, doctor, pharmacy, lab, insurance, admin — are now hosted-parity, Supabase-backed, and covered by end-to-end browser tests. All work landed with `npm run typecheck` and `npm run lint --max-warnings 0` green; `npm run test:e2e` is green at **124/124**.

## What We Accomplished

### 1. Wrapped Lab & Radiology portal parity (PR #31 — `Wrapped Lab parity`)

- Refactored `EquipmentCard` so radiology and laboratory cards each render the hosted layout shape:
  - Radiology: status pill / NAME / model (equipmentType) / type (subtitle) / activity panel with active user + remaining time.
  - Laboratory: status pill / room / NAME / equipmentType / activity description (subtitle) with active remaining label.
- Dynamic status labels driven by current equipment state and alert text: `SCANNING` (active scan), `RUNNING` (active batch), `ONLINE`, `SCHEDULED` (next-slot warning), `QA IN PROGRESS` (QA warning), `WARNING`, `MAINTENANCE`. Each label now has a hosted-matching tone class (violet for active, amber for maintenance, cyan for scheduled, orange for warning/QA).
- Replaced the action-row labels per department: `📊 Stats` + `⚙️ Log Maintenance` for laboratory, `📋 Schedule` + `⚙️ Maintenance` for radiology.
- Switched `formatTat` to decimal-hour rendering (`2.5h`, `4.8h`) so TAT badges and labels match hosted exactly.
- Updated the lab shell sidebar:
  - Facility identity card now joins `facility.address · facility.city · DHA Licensed ✅` from `lab_profiles` data instead of a fixed string.
  - User block now shows `displayName · Day Shift` (was `Active shift`).
  - Footer rewritten as a multi-line block: `<samples> samples · <complete> complete`, `<studies> studies · <reported> reported`, `<critical> critical unnotified`, `<nabidh> NABIDH pending`, `v2.4.1 · Production`, matching the hosted reference's bottom panel line-by-line.
- Corrected sidebar-badge filter semantics on `useLabOpsPortal` so counts match the hosted "inbox" model:
  - `labOrders`: `samples.status === 'ordered'` (was `'ordered' || 'collected'`).
  - `imagingQueue`: `'scanning' || 'scheduled' || 'report_pending'` (was `!== 'released'`).
  - `imagingOrders`: `'ordered'` only (was `'ordered' || 'scheduled'`).
  - `labResults`: counts `'resulted' || 'reviewed'` (filter Q noted as open question).
- Seed migration `20260510020000_add_lab_imaging_orders_inbox.sql` — adds 3 ordered imaging studies (Khalid Al Suwaidi MRI Brain w/wo contrast STAT, Layla Al Falasi USS Abdomen Urgent, Mohammed Al Habsi CT Chest w/ contrast Urgent), each with ICD-10, CPT, contrast, prep instructions, room availability, suggested slot, pre-auth state, and insurance carrier.
- Seed migration `20260510030000_add_third_lab_order_inbox.sql` — adds 2 ordered lab orders (Ibrahim Al Marzouqi HbA1c surveillance, Noura Al Hashimi annual physical) and hides the orphan demo order `LAB-20260304-0921` so the New tab lands at the hosted "3" badge count.
- Authored `docs/ui-parity/lab-radiology/parity-checklist-2026-05-10.md` documenting the 14-tab parity matrix, the sidebar-by-sidebar comparison, the 9 open volume/semantic questions, and the verification status.

### 2. Built Platform Admin portal to full hosted parity (PR #32 — `feat: admin portal full hosted parity (5-26-w2-admin)`)

- New `src/pages/admin/Portal.tsx` shell mirroring the hosted Bolt reference DOM-for-DOM across Dashboard, Patients, Doctors, Organizations, Insurance, and AI Analytics:
  - Dark navy sidebar with role badge block, button-row nav with badges (blue queue counts, amber warnings, red criticals, violet NABIDH), and sticky page header with search / notifications / avatar.
  - Shared UI primitives: `Card`, `Pill`, `KpiTile`, `PageHeader`, `RevenueBars`, `OrganizationCard`, `InsurancePartnerCard`, `SystemHealthCard`, `QuickActions`.
- Eleven new Supabase tables backing the portal: `admin_portal_context`, `admin_dashboard_issues`, `admin_doctor_directory`, `admin_patient_directory`, `admin_insurance_partners`, `admin_portal_status_snapshots`, `admin_live_activity_events`, `admin_compliance_checklist`, `admin_license_alerts`, `admin_ai_usage_breakdown`, `admin_revenue_daily`. All RLS-locked to `super_admin`.
- Five new SECURITY-DEFINER RPCs: `admin_get_dashboard`, `admin_get_doctor_directory`, `admin_get_patient_directory`, `admin_get_insurance_partners`, `admin_get_ai_dashboard`.
- Five new typed React hooks wire the UI to live data: `useAdminDashboard`, `useAdminDoctorDirectory`, `useAdminPatientDirectory`, `useAdminInsurancePartners`, `useAdminAiDashboard`.
- Router serves `/admin/dashboard`, `/admin/patients`, `/admin/doctors`, `/admin/organizations`, `/admin/insurance`, `/admin/ai-analytics`, plus an `/admin/ai` alias.
- Bundled the week's other supporting migrations: `20260510000000_extend_insurance_portal_seed_data.sql`, `20260510010000_add_admin_portal_parity_data.sql`, `20260510020000_add_lab_imaging_orders_inbox.sql`, `20260510030000_add_third_lab_order_inbox.sql`.
- Live smoke as `admin1@aryaix.com`: 48,231 patients, 847 verified doctors, 23 pending DHA, AED 847K revenue, 99.97% uptime, NABIDH approved.

### 3. Built Insurance Operator portal to full hosted parity (PR #34 — `feat: insurance portal full hosted parity (5-26-w2)`)

- Rewrote `use-insurance-portal.ts` to expose every field the hosted UI surfaces — payer profile (Arabic name, Gold/Silver/Basic counts, AI auto-approval %, processing time, SLA targets, today's claim aggregates, MTD vs. budget, growth %), pre-auth (patient age/gender, plan tier/label, ICD code, coverage label + %, CeenAiX e-prescribed flag, AI recommendation + confidence), claim (plan tier, claim type), network provider (denial rate, fraud score, network note), plus two new collections `insurance_ai_insights` and `insurance_monthly_claims_volume`. **No schema changes** — every field already lived in Supabase from prior seeds plus the new `20260510000000_extend_insurance_portal_seed_data.sql` migration.
- **Dashboard**: 6-tile hosted KPI grid (Pending PA, Claims Today, AI Auto-Approval Rate, Active Fraud Alerts, Avg Processing Time, Active Members with tier breakdown); full PA queue with AI-rec filter tabs + bulk-approve; monthly volume chart with volume / value / both toggle and budget callout; AI Risk Intelligence cards; Fraud Alert cards; Top Network Providers preview; 6-button quick-action row.
- **Pre-Authorizations**: hosted-style table (PA Ref, Patient with tier badge & age/gender, Doctor/Clinic, Procedure with ICD, Cost with coverage, AI Rec + confidence, SLA, Approve/Review actions); search + 6 filter tabs (All / Urgent / AI: Review / AI: Deny / Overdue / Approved); bulk approve count.
- **Claims**: 5 KPI tiles (Total Value, Auto-Approved, Pending, Denied, Appealed); status-tabbed worklist with search by ref / member / provider.
- **Members**: tier KPI tiles (Active + Gold/Silver/Basic); search + risk filter; color-coded utilization bars (red/amber/emerald thresholds).
- **Fraud Detection**: severity KPI tiles + total exposure; 2-col rich alert cards with severity filter and Investigate / Freeze Claims actions.
- **Risk Analytics**: KPI summary + segment loss-ratio bars (carried forward).
- **Network Providers**: KPI tiles (In-Network, Total Claims, Avg Approval, Flagged for Review); hosted table with denial % badges + fraud score badges + network notes; provider/specialty search.
- **Reports**: 4 KPI tiles; runs grouped by category (Regulatory / Financial / Utilization / Risk & Fraud / Operational); per-row Download buttons that disable on non-ready runs.
- **Settings**: payer profile header (officer + SLA targets); preferences grouped by domain (AI & Automation / Alerts & Notifications / Compliance & Audit / Fraud & Risk / General).

### 4. Closed the admin onboarding round-trip (PR #35 — `fix(admin): wire onboarding buttons + in-app org onboarding modal`)

- Wired previously-inert header buttons on the admin Patients, Doctors, Insurance, and Organizations pages:
  - **Analytics** → `/admin/ai-analytics`.
  - **Export** → client-side CSV download (`doctors-YYYY-MM-DD.csv`, `patients-…`, `insurance-partners-…`, `organizations-…`), driven by a new module-level `exportRowsToCsv` helper.
  - **Add Doctor** / **Register Patient** / **Onboard Insurer** → `/auth/register?role=doctor|patient|insurance`.
- Added a real in-app `OnboardOrganizationModal` on `/admin/organizations` for super-admins:
  - Kind picker (hospital / clinic / lab / pharmacy / insurance) shown as selectable cards, with the **Onboard Pharmacy** and **Onboard Lab** buttons opening the modal preset to the corresponding kind, plus a new **+ Add Organization** primary CTA.
  - Required name, optional city, seats allocated, primary contact name/email (with email regex), notes.
  - Submit lockout + inline error surface; success toast + live `refreshOrganizations()` refetch so the new row appears in the directory immediately with `status='pending'`.
- New `admin_create_organization` RPC (`supabase/migrations/20260510040000_add_admin_create_organization_rpc.sql`):
  - `SECURITY DEFINER`, guarded by `is_current_user_super_admin()` — non-admin callers get `P0001 "Only super_admin users can create organizations"`.
  - Validates `kind` against `('hospital','clinic','lab','pharmacy','insurance')` and `status` against `('active','suspended','pending','archived')`, matching the existing CHECKs on `public.organizations`.
  - Auto-derives slug from name (`Mediclinic City` → `mediclinic-city`) and appends `-2`, `-3`, … on collision.
- Hardened the Register page's Full Name input against browser autofill so admins onboarding a different user start from a clean form: `autoComplete="off"` + a non-standard `name="register-full-name"` + `data-1p-ignore` + `data-lpignore="true"` + `data-form-type="other"`.
- Threaded `AdminContext.refreshOrganizations` so the modal can trigger a refetch without remount.

### 5. Shipped Playwright E2E coverage (PRs #33 + #36)

- Added Playwright configuration, npm scripts (`npm run test:e2e`, `npm run test:e2e:ui`), and deterministic Supabase mocks under `e2e/support/supabase-mock.ts` (Auth, REST, RPC, Storage, Edge Functions).
- **124 passing browser tests** total, **23 of them stateful scenario tests** covering cross-role workflows and negative paths:
  - Admin onboards lab → patient books → doctor orders lab → lab receives → patient sees upcoming.
  - Lab processes order, saves result, releases, patient sees resulted lab.
  - Admin can/cannot onboard organizations (missing name, invalid email).
  - Pharmacy onboarding + filter-by-pending flows.
  - Admin Add Doctor routes into doctor registration.
  - Patient appointment booking, reschedule, cancel, no-show propagation.
  - Doctor no-show analytics, lab-order validation (no patient / no test), cancel from worklist, pre-visit summary visibility.
  - Patient sees incomplete lab as upcoming (not completed).
  - Lab cannot release before all results completed.
  - Lab saved-draft result not leaking to patient until release.
  - Doctor-created lab order creates a patient notification handoff.
  - Role-denied access for patient→lab and doctor→admin.
  - Newly-onboarded lab filters under pending status.
- Companion weekly report: `docs/weekly-report/weekly-report-2026-05-11-e2e-scenario-tests.md`.

### 6. Closed 120-bug audit on the `bugs` branch

Across the ten functional areas documented in `docs/agent/BUGS_FIXED.md`. Headline categories:

- **Localization regressions**: hard-coded English strings (login validation, ForgotPassword copy, OTP verification, ICS summary/description, patient dashboard "Good afternoon", DAMAN branding fallback, calendar weekday headers) replaced with `t()` keys plus matching `en` and `ar` locale entries.
- **Timezone bugs**: ICS export, patient appointment mini-calendar, and `dateFrom`/`dateTo` range pickers were using `toISOString()` and `new Date('YYYY-MM-DD')` (UTC), shifting UAE users to the previous local day. Replaced with local-timezone helpers.
- **Numeric defenses**: divide-by-zero / `NaN` on insurance progress bar; `toLocaleString()` without locale; nullish-coalescing instead of `||` where valid `0` / `""` / `false` was being swallowed.
- **Onboarding loop fix**: Skip button was routing to a role default while `profile_completed=false`, getting kicked back by `ProtectedRoute`. Skip CTA removed with an in-code rationale comment.
- **`safeString` nullish bug**: previously returned `''` instead of `null`, breaking the `?? email ?? ''` fallback chain in onboarding.
- **VerifyOTP type mismatch**: would attempt SMS verification against an email-only payload; tightened the branch to require `type === 'email'` for the email path.

Plus matching follow-up sweeps for Doctor portal pages (`finishEstimate` "~4:00 PM" fallback → em-dash, hour-aware greeting), Pharmacy / Doctor search placeholders, OpsShell layout, and the doctor dashboard.

### 7. Lab and Admin / Insurance / Doctor type-contract reconciliation

- Rebased admin and insurance TypeScript contracts after the parallel parity rewrites landed in different orders on `main`. Drift surfaced by `npm run typecheck` was closed before each branch merged, so `main` is clean at every PR boundary.
- Cleaned the lint warning on `ErrorBoundary.tsx` (`react-refresh/only-export-components`) and the pre-existing TS errors on `pharmacy/Reports.tsx` and `pharmacy/Revenue.tsx` (`dateTimeFormatWithNumerals` argument order) that were blocking CI on the lab/insurance branch.

## Business Impact

- All six operational portals — patient, doctor, pharmacy, lab, insurance, admin — are now demo-credible against the hosted Bolt reference. Every tab matches DOM and styling, and every count, row, and badge is sourced from Supabase rather than fixtures.
- Admins can now operate the platform end-to-end without leaving `/admin/*`: onboard organizations (hospital, clinic, lab, pharmacy, insurance) directly in the UI, register new doctors / patients / insurers, export filtered directories to CSV, and drill into AI Analytics. The previous deep-link-to-/auth/register path remains for new-user invites but is no longer the only path for tenant onboarding.
- Insurance operators can now triage pre-authorizations, claims, members, fraud alerts, network providers, regulatory reports, and settings against the same surface the hosted demo shows. AI recommendations and confidence are first-class fields on the PA queue.
- The Playwright suite (124 tests, 23 cross-role scenarios) gives engineering a regression net for the next round of workflow features (claim sample, prescribe, dispense, claim adjudication) and surfaces role-guard / negative-path failures inside CI rather than QA.
- The 120-fix audit removed a long tail of localization gaps, timezone bugs, and silent fallbacks across all six roles. Arabic-locale users in particular benefit from correctly localized validation copy, calendar headers, ICS invites, and dashboard greeting strings.

## Details

| ID      | Item                                              | Status | Completed  | PR  | Notes |
| ------- | ------------------------------------------------- | ------ | ---------- | --- | ----- |
| LAB-W2-01 | Wrapped Lab parity — EquipmentCard refactor | done | 2026-05-10 | #31 | Department-specific layout (radiology vs lab); dynamic status labels `SCANNING` / `RUNNING` / `ONLINE` / `WARNING` / `SCHEDULED` / `QA IN PROGRESS` / `MAINTENANCE`; tone classes per state |
| LAB-W2-02 | Lab TAT decimal-hour formatting | done | 2026-05-10 | #31 | `formatTat` returns `2.5h`, `4.8h` to match hosted badges/labels |
| LAB-W2-03 | Lab sidebar facility / footer parity | done | 2026-05-10 | #31 | Address · City · DHA Licensed ✅; Day Shift; multi-line footer (samples / studies / critical / NABIDH / v2.4.1) |
| LAB-W2-04 | Lab sidebar badge semantics | done | 2026-05-10 | #31 | `labOrders = ordered`, `imagingQueue = scanning ∪ scheduled ∪ report_pending`, `imagingOrders = ordered` |
| LAB-W2-05 | Lab Orders / Imaging Orders inbox seed | done | 2026-05-10 | #31 | 3 ordered imaging studies + 2 ordered lab orders; orphan `LAB-20260304-0921` hidden |
| LAB-W2-06 | Lab parity checklist doc | done | 2026-05-10 | #31 | `docs/ui-parity/lab-radiology/parity-checklist-2026-05-10.md` |
| ADM-W2-01 | Admin portal shell rewrite | done | 2026-05-10 | #32 | Dark sidebar + white content shell; `Card` / `Pill` / `KpiTile` / `PageHeader` / `RevenueBars` / `OrganizationCard` / `InsurancePartnerCard` / `SystemHealthCard` / `QuickActions` primitives |
| ADM-W2-02 | Admin Dashboard data binding | done | 2026-05-10 | #32 | New `admin_get_dashboard` RPC + `useAdminDashboard` hook |
| ADM-W2-03 | Admin Patients / Doctors directories | done | 2026-05-10 | #32 | `admin_doctor_directory` + `admin_patient_directory` tables, `admin_get_doctor_directory` / `admin_get_patient_directory` RPCs, `useAdminDoctorDirectory` / `useAdminPatientDirectory` hooks |
| ADM-W2-04 | Admin Organizations directory | done | 2026-05-10 | #32 | `admin_list_organizations` RPC; pill filter (hospital / clinic / lab / pharmacy / insurance); status filter (active / pending / suspended / archived) |
| ADM-W2-05 | Admin Insurance partners | done | 2026-05-10 | #32 | `admin_insurance_partners` table + `admin_get_insurance_partners` RPC; `useAdminInsurancePartners` hook |
| ADM-W2-06 | Admin AI Analytics tab | done | 2026-05-10 | #32 | `admin_ai_usage_breakdown` table + `admin_get_ai_dashboard` RPC; `useAdminAiDashboard` hook; `/admin/ai-analytics` route + `/admin/ai` alias |
| ADM-W2-07 | Admin supporting tables | done | 2026-05-10 | #32 | `admin_portal_context`, `admin_dashboard_issues`, `admin_portal_status_snapshots`, `admin_live_activity_events`, `admin_compliance_checklist`, `admin_license_alerts`, `admin_revenue_daily`. All RLS-locked to `super_admin` |
| INS-W2-01 | Insurance hook full hosted-UI surface | done | 2026-05-10 | #34 | Payer / PA / claim / network fields + `insurance_ai_insights` + `insurance_monthly_claims_volume` collections; **no schema change** |
| INS-W2-02 | Insurance Dashboard parity | done | 2026-05-10 | #34 | 6-KPI grid; PA queue with AI-rec tabs + bulk approve; monthly volume chart; AI Risk Intelligence; Fraud Alerts; Top Network Providers; 6-button action row |
| INS-W2-03 | Insurance Pre-Authorizations parity | done | 2026-05-10 | #34 | Hosted table; search + 6 filter tabs; bulk approve |
| INS-W2-04 | Insurance Claims parity | done | 2026-05-10 | #34 | 5 KPI tiles; status-tabbed worklist with search |
| INS-W2-05 | Insurance Members parity | done | 2026-05-10 | #34 | Tier KPI tiles; search + risk filter; color-coded utilization bars |
| INS-W2-06 | Insurance Fraud Detection parity | done | 2026-05-10 | #34 | Severity tiles + total exposure; rich 2-col alert cards; Investigate / Freeze Claims |
| INS-W2-07 | Insurance Network Providers parity | done | 2026-05-10 | #34 | KPI tiles; hosted table with denial % + fraud score badges + network notes; search |
| INS-W2-08 | Insurance Reports parity | done | 2026-05-10 | #34 | 4 KPI tiles; runs grouped by category (Regulatory / Financial / Utilization / Risk & Fraud / Operational); per-row Download buttons |
| INS-W2-09 | Insurance Settings parity | done | 2026-05-10 | #34 | Payer profile header; preferences grouped by domain (AI & Automation / Alerts & Notifications / Compliance & Audit / Fraud & Risk / General) |
| ADM-W2-08 | Admin header buttons wired | done | 2026-05-11 | #35 | Patients / Doctors / Insurance / Organizations — Analytics, Export (CSV), Add Doctor / Register Patient / Onboard Insurer all functional |
| ADM-W2-09 | In-app organization onboarding modal | done | 2026-05-11 | #35 | Kind picker (hospital / clinic / lab / pharmacy / insurance); name/city/contact/seats/notes; validation; success toast; live refresh |
| ADM-W2-10 | `admin_create_organization` RPC | done | 2026-05-11 | #35 | `SECURITY DEFINER` + super-admin guard; kind/status CHECK alignment; auto-slug with uniqueness suffix; granted to `authenticated` |
| ADM-W2-11 | Register page autofill hardening | done | 2026-05-11 | #35 | `autoComplete="off"` + non-standard `name` + `data-1p-ignore` / `data-lpignore` / `data-form-type="other"` on Full Name |
| QA-W2-01 | Playwright config + Supabase mocks | done | 2026-05-11 | #33 | `playwright.config.ts`; `npm run test:e2e` / `npm run test:e2e:ui`; `e2e/support/supabase-mock.ts` for Auth / REST / RPC / Storage / Functions |
| QA-W2-02 | Broad role + route coverage | done | 2026-05-11 | #33 | Public, auth, unauthenticated guards, wrong-role denial, patient / doctor / admin / lab portal routes |
| QA-W2-03 | Cross-role clinical workflow scenarios | done | 2026-05-11 | #33 | 23 stateful scenarios — admin → patient → doctor → lab handoff; reschedule / cancel / no-show; lab release blocking; role-denied access |
| QA-W2-04 | Negative-case coverage | done | 2026-05-11 | #33 | Missing org name; invalid contact email; missing visit reason; missing patient / test on lab order; incomplete-result release block; draft-result patient leak |
| QA-W2-05 | Weekly E2E report doc | done | 2026-05-11 | #36 | `docs/weekly-report/weekly-report-2026-05-11-e2e-scenario-tests.md` |
| BUG-W2-01 | 120-fix audit closure | done | 2026-05-11 | `bugs` → `main` | `docs/agent/BUGS_FIXED.md` — auth flows, patient/doctor/lab/pharmacy portals, admin/insurance, public pages, hooks, shared components, libraries |
| BUG-W2-02 | Localization parity sweep | done | 2026-05-11 | `bugs` | Hard-coded English strings replaced with `t()` keys; English + Arabic locale entries added (login validation, ForgotPassword, OTP, ICS, dashboard greetings, DAMAN fallback, weekday headers) |
| BUG-W2-03 | Timezone bug fixes | done | 2026-05-11 | `bugs` | ICS export, patient mini-calendar tap, `dateFrom`/`dateTo` range parse — UAE users no longer shift to the previous local day |
| BUG-W2-04 | Numeric defenses | done | 2026-05-11 | `bugs` | Insurance progress `NaN%` → `0%`; `toLocaleString` locale fixed; `||` → `??` where valid `0` / `""` / `false` were being swallowed |
| BUG-W2-05 | Onboarding redirect loop | done | 2026-05-11 | `bugs` | Skip CTA removed with in-code rationale; `profile_completed=false` no longer ping-pongs against `ProtectedRoute` |
| BUG-W2-06 | `safeString` nullish bug | done | 2026-05-11 | `bugs` | Returns `null` (not `''`) so `?? email ?? ''` fallback fires correctly |
| BUG-W2-07 | VerifyOTP type-mismatch guard | done | 2026-05-11 | `bugs` | Tightened branch — `type === 'email'` required for email verification path |
| CI-W2-01 | Zero-warning lint + typecheck on merge | done | 2026-05-11 | all | `npm run typecheck` and `npm run lint --max-warnings 0` green on every merged PR; pre-existing TS errors on `pharmacy/Reports.tsx` and `pharmacy/Revenue.tsx` fixed; `ErrorBoundary.tsx` lint warning resolved |
| CI-W2-02 | E2E green at merge | done | 2026-05-11 | #33, #36 | `npm run test:e2e -- e2e/clinical-workflows.spec.ts` 23/23; `npm run test:e2e` 124/124 |
| MIG-W2-01 | Lab + Insurance + Admin migrations | done | 2026-05-11 | #31, #32, #34, #35 | `20260510000000_extend_insurance_portal_seed_data.sql`, `20260510010000_add_admin_portal_parity_data.sql`, `20260510020000_add_lab_imaging_orders_inbox.sql`, `20260510030000_add_third_lab_order_inbox.sql`, `20260510040000_add_admin_create_organization_rpc.sql` |
| OPEN-Q1 | Lab seed volume parity | open | | — | Hosted dashboard shows 234 samples / 47 studies; local has ~14 / ~13. Follow-up: `seed/lab-bulk-2026-05` PR with `generate_series`-based bulk inserts |
| OPEN-Q2 | Lab sidebar badge filter Qs (Q3 / Q4 / Q5) | open | | — | Lab Queue / Lab Results / Imaging Queue badge semantics need product confirmation against hosted counts (14 / 5 / 7) |
| OPEN-Q3 | Lab→organization back-link | open | | — | When an admin creates a `kind='lab'` org via the new onboarding modal, no `lab_profiles` row is auto-seeded; tracked as Q9 in the lab parity checklist. Recommend a follow-up `feat(admin): seed lab_profiles on lab org create` PR |
| OPEN-Q4 | Dedicated Labs / Pharmacies admin sidebar | open | | — | Today labs and pharmacies live inside the Organizations directory filtered by `kind`. Options: (a) deep-linked sidebar items (`?kind=lab`), (b) dedicated `LabsView` / `PharmaciesView` backed by `lab_profiles` / pharmacy directory RPCs (mirrors `useAdminDoctorDirectory`) |
| OPEN-Q5 | Admin demo password drift | open | | — | `lab1@aryaix.com` no longer accepts `CeenAiXDemo!` from `20260419220050_create_demo_lab_and_admin_auth_users.sql`. Repair migration recommended or document the rotated password |
| OPEN-Q6 | Migration history drift | open | | — | `supabase db push --dry-run` reports 22 remote migrations not present locally. Recommend `supabase db pull` PR before next push |

## Verification

Final verification on merged commits:

```text
npm run typecheck
passed

npm run lint --max-warnings 0
passed

npm run test:e2e -- e2e/clinical-workflows.spec.ts
23 passed

npm run test:e2e
124 passed
```

Branches merged to `main` this week:

| PR | Title | Branch | Merged | Δ LOC | Files |
| --- | --- | --- | --- | --- | --- |
| #31 | Wrapped Lab parity | (lab parity) | 2026-05-10 22:49Z | +2,534 / −593 | 85 |
| #32 | feat: admin portal full hosted parity (5-26-w2) | `5-26-w2-admin` | 2026-05-10 23:01Z | +4,037 / −555 | 9 |
| #34 | feat: insurance portal full hosted parity (5-26-w2) | `5-26-w2-insurance-paritiy` | 2026-05-10 23:38Z | +1,257 / −165 | 2 |
| #35 | fix(admin): wire onboarding buttons + in-app org onboarding modal | `admin-onboarding-org-buttons` | 2026-05-11 00:25Z | +594 / −12 | 5 |
| #33 | Add Playwright E2E coverage for role journeys | `cursor/e2e-role-coverage-fff9` | 2026-05-11 01:01Z | +4,553 / −183 | 13 |
| #36 | Add weekly E2E scenario test report | `cursor/e2e-role-coverage-fff9` (follow-up) | 2026-05-11 01:10Z | +96 | 1 |

## Residual Notes

- **Lab seed volume (OPEN-Q1)**: Local lab/imaging seeds are intentionally light (~14 samples, ~13 studies). Dashboard KPIs read off these counts. A follow-up bulk-seed PR is needed before the dashboard volume numbers line up with the hosted 234 / 47 baseline.
- **Lab badge filter semantics (OPEN-Q2)**: Lab Queue / Lab Results / Imaging Queue badge counts depend on filter rules that don't yet match the hosted counts (14 / 5 / 7). Tracked as Q3 / Q4 / Q5 in the lab parity checklist for product confirmation.
- **Lab ↔ org link (OPEN-Q3)**: Creating a `kind='lab'` organization via the new admin modal does not yet seed a matching `lab_profiles` row. A follow-up PR should either auto-create the lab profile or mark the org as needing one.
- **Dedicated Labs / Pharmacies admin sections (OPEN-Q4)**: Labs and pharmacies are reachable from the admin via the Organizations directory + kind filter. A first-class `LabsView` / `PharmaciesView` backed by domain-specific directory RPCs would match how Doctors / Patients / Insurance are already treated.
- **Demo password drift (OPEN-Q5)**: `lab1@aryaix.com` no longer accepts the seeded `CeenAiXDemo!`. Either re-`UPDATE auth.users` via a repair migration or document the rotated password in `docs/keys.local.md`.
- **Migration history drift (OPEN-Q6)**: `supabase migration list --linked` shows remote-only migrations not in this repo. Recommend running `supabase db pull` in a dedicated PR before any further `supabase db push`.
- **Playwright browsers in CI**: Chromium binaries were installed manually (`npx playwright install chromium`) in the current sandbox. Cloud environments should bake this into the base image or startup script.
