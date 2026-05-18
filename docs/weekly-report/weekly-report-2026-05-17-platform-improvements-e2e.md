# Weekly Report — Platform Improvements & E2E Expansion

Date: 2026-05-17  
Project: CeenAiX  
Scope: 5-26-w3 bug-fix sprint (portal reliability, hook correctness, CTA wiring), Playwright suite growth, dev/prod CI pipeline split, branded auth email  
Branch: `5-26-w3` → `main` (PRs #39–#48)

## Executive Summary

| Metric | This week | Prior week (2026-05-11) |
|--------|-----------|-------------------------|
| **Platform improvements** | **206** | 120 |
| **E2E tests added** | **+21** (124 → **145** total) | +124 (initial suite) |
| Stateful scenario tests | 23 (unchanged) | 23 |
| New E2E spec files | `portal-interactions.spec.ts` (20), `multi-role-interactions.spec.ts` (1) | `clinical-workflows.spec.ts`, `role-journeys.spec.ts` |

This week closed **206 categorized platform improvements** on sprint `5-26-w3` (ledger `docs/sprints/5-26-w3-bug-ledger.md`, items **#1–#206**). Improvements cover unwired Bolt CTAs, silent Supabase error paths, auth race/timeouts, hook query filters (cancelled appointments, doctor dashboard KPIs, insurance load errors), canonical public directory RPCs, and pharmacy/lab/insurance/admin operational wiring.

In parallel, Playwright grew by **21 browser tests** to **145 passing** total: **20 portal interaction tests** across patient, doctor, pharmacy, lab, insurance, admin, and public routes, plus **1 multi-role journey** (patient books → doctor sees appointment and creates lab order → lab worklist → insurance portal render → admin live activity). The existing **23 stateful clinical scenario tests** were un-rotted for wall-clock dates and doctor list-view assertions.

Dev delivery was also hardened: **Build** on merge to `main` deploys **dev** (`dev.ceenaix.com` + Supabase `lgfaucsfiyxvmsghnpey`); **Release** is **manual prod only**; migrations apply via Management API; branded auth email templates sync on each dev deploy.

## Platform Improvements (206)

Improvements are tracked as **improvements** (not “bugs”) in the sprint ledger. Severity mix: **P0/P1** auth and data-loss risks; **P2** wrong data or blocked users; **P3** polish and UX honesty.

### Wave 1 — Portal reliability & CTA wiring (#1–#106)

- **Auth & routing**: non-MVP roles no longer loop through onboarding; login/signup/recovery timeouts and field limits; profile-load generation guard; language pref cleared on sign-out.
- **Patient**: telemedicine “view appointment” routes to live list; documents/settings/insurance CTAs wired; cancelled/no-show section; records field limits; dashboard load errors surfaced.
- **Doctor**: appointments day/month views, CSV export, KPI navigation, canonical `confirmed` calendar styling; patients row actions route to detail; dashboard metric routing and pre-visit/lab KPI fixes.
- **Pharmacy**: stock-alert sort by clinical severity; inventory batch panel; settings toggles persist; messages send path; revenue claim detail inline.
- **Lab**: placeholder CTAs replaced with queue/orders/results/radiology handlers; `lab_order_items.id` in selects.
- **Insurance**: bulk/single approve mutations, export CSV, fraud/pre-auth navigation, load-error banners on all tabs via `PortalQueryBanner`.
- **Admin**: issue-banner CTAs route by category; org cards drop fake “monthly trans” metrics; doctor verify OK/Reject; onboarding modal retained.
- **Public**: find-doctor/clinic/laboratories use canonical RPCs with explicit load errors (no silent sample fallback).
- **Hooks & libs**: messaging stale guards, AI chat session switch reset, pre-visit autofill order, medication schedule frequency parsing, booking slot boundary, orphan AI storage rollback.
- **E2E maintenance (#20, #40–#41, #101–#106)**: dynamic Monday dates, list-view tab before doctor assertions, cancelled-appointment section coverage.

### Wave 2 — Dashboard correctness & interaction coverage (#107–#206)

- **Doctor dashboard hooks**: pending review uses `status=pending`; pre-visit backlog uses `reviewed_at`; clinic TZ day bounds for “today” Rx/lab counts; resulted **and** reviewed lab items; critical labs after review; patient age from date-only DOB.
- **Insurance**: urgent KPI counts pending pre-auths only; shared shell load-error + retry on every workspace tab.
- **Pharmacy/lab portals**: `PortalQueryBanner` on inventory, dispensing, reports, revenue, settings, messages, result entry, referrals, radiology, dashboard.
- **Patient/doctor dashboards**: surfaced hook error strings; `role="alert"` on error panels; clinic TZ keys for `/doctor/today` near midnight.
- **E2E expansion (#160–#191, #204–#205)**: `portal-interactions.spec.ts` (20 tests); pharmacy + insurance roles/seeds in `e2e/support/supabase-mock.ts`; suite total **145** green.

Full per-item traceability: `docs/sprints/5-26-w3-bug-ledger.md`.

## E2E Coverage Added (+21 tests)

### Portal interaction suite (`e2e/portal-interactions.spec.ts`) — 20 tests

| # | Area | What it validates |
|---|------|-------------------|
| 1 | Public / find-doctor | Bookable doctors from canonical RPC |
| 2 | Public / find-clinic | Facilities from canonical RPC |
| 3 | Public / laboratories | Labs list from canonical RPC |
| 4 | Patient / appointments | Cancelled filter available |
| 5 | Patient / records | Add-condition control visible |
| 6 | Patient / settings | Password reset action |
| 7 | Patient / insurance | Plan workspace renders |
| 8 | Patient / lab results | Page loads without runtime error |
| 9 | Doctor / dashboard | Today schedule section |
| 10 | Doctor / appointments | List view tab usable |
| 11 | Doctor / patients | List opens from dashboard path |
| 12 | Doctor / schedule | Availability controls |
| 13 | Pharmacy / dashboard | Queue workspace |
| 14 | Pharmacy / messages | Thread list |
| 15 | Lab / dashboard | Worklist |
| 16 | Insurance / dashboard | Pre-auth workspace |
| 17 | Admin / organizations | Onboard lab CTA |
| 18 | Public / health education | Article workspace |
| 19 | Auth guard | Unauthenticated patient route → login |
| 20 | Role guard | Patient cannot open doctor dashboard |

### Multi-role interaction (`e2e/multi-role-interactions.spec.ts`) — 1 test

21. **Patient booking propagates to doctor, lab, insurance, and admin** — single spec opens five role contexts: patient books with reason → doctor sees appointment (list view) and creates lab order → lab dashboard shows order → insurance portal renders without console errors → admin live activity shows booking event.

### Existing suite (maintained)

- **`e2e/role-journeys.spec.ts`**: 101 route/smoke/guard tests (unchanged count).
- **`e2e/clinical-workflows.spec.ts`**: 23 stateful cross-role scenarios (dates and list-view fixes; no new scenarios).

**Net:** 124 → **145** tests (**+21**).

## CI / Platform Delivery (same week)

- **Pipeline split (PR #45)**: push to `main` → Build deploys dev only; prod via manual `deploy.yml` Release.
- **Dev migrations (PRs #46–#48)**: Management API apply + drift skip; pooler URL for optional CLI fallback.
- **Auth email (PR #43)**: shared CeenAiX HTML layout; `sync-dev-auth-platform.sh` on Build sets `site_url` to `https://dev.ceenaix.com`.

## Implementation Notes

- Sprint ledger: `docs/sprints/5-26-w3-bug-ledger.md` (206 rows, `#1`–`#206`).
- Vitest excludes `e2e/**` so `npm test` and Playwright do not collide.
- E2E mocks extended for `pharmacy` and `insurance` roles (`e2e/support/supabase-mock.ts`).
- Prior week baseline: [Weekly Report — E2E Scenario Test Coverage (2026-05-11)](weekly-report-2026-05-11-e2e-scenario-tests.md).

## Verification

```text
npm run test:e2e
145 passed

npm run typecheck
passed

npm run lint -- --max-warnings 0
passed
```

## Residual Notes

- Insurance multi-role step validates **render contract** only (no claim write path in MVP).
- Dev confirmation email depends on Resend SMTP in Supabase dashboard; GitHub `SUPABASE_RESEND_SMTP_PASSWORD` is optional for CI re-apply but recommended for Build verification.
- Admin “Add Doctor” still routes to registration — E2E reflects current UX (same as prior week).
