# PR #80 Review — Bug fixing v2 portal fixes

| Field | Value |
|---|---|
| Title | Bug fixing v2 - Patient + Doctor + Pharmacy +clinic testing and fixing issues |
| URL | https://github.com/AryAiX/CeenAiX-10895ac7/pull/80 |
| Author | @Abud-ai |
| Branch | `bug-fixing-v2` -> `main` |
| Size | +8,903 / -1,547 across 79 files, 172 commits |
| State | OPEN, `reviewDecision = REVIEW_REQUIRED` |
| Mergeable | `MERGEABLE` / `mergeStateStatus = BLOCKED` |
| CI | Lint, Typecheck & Build = PASS; Migration dry-run (PR) = PASS; Dev Supabase / Dev Deploy = SKIPPED |

---

## Verdict

**REQUEST CHANGES — DO NOT MERGE AS-IS.**

PR #80 contains useful fixes and a materially better clinic portal, but it still should not be merged wholesale because unsafe migrations are mixed into the 172-commit branch. PR #81 now safe-ports the replacement clinic portal and most patient/doctor workflow fixes, while replacing or omitting the unsafe database pieces.

---

## Merge-blockers (P0)

- **Resolved in PR #81: clinic portal replacement is included with safety rewrites.** The new clinic shell, dashboard, doctors, appointments, patients, pricing/services, messages, notifications, analytics, and settings pages are ported. Routing now goes through `ClinicPortal`.
- **Resolved in PR #81: hardcoded clinic/facility mutations are omitted.** The safe port does not insert demo `facility_staff` rows and does not relink existing appointments to a fixed facility UUID.
- **Resolved in PR #81: broad RLS is replaced.** New policies are idempotent and relationship-scoped: clinic patient reads require appointments at the caller's clinic; patient/doctor membership reads are tied to appointments or facility staff links; clinic appointment creation requires the caller's clinic and an active doctor link.
- **Resolved in PR #81: privileged approval RPC is rewritten.** `approve_doctor_and_link_appointments` now validates the staff row, facility, doctor, and caller authority before approving, and only links null-facility appointments scheduled after the staff link was created.
- **Resolved in PR #81: billing/invoices remain omitted.** The PR #80 `patient_invoices` table and invoice writes were not ported. Clinic analytics now derives revenue from completed appointments and facility/doctor fees.
- **Resolved in PR #81: message soft-delete mismatch is closed.** The safe migration adds `messages.is_deleted` and a sender-scoped update policy; doctor dashboard no longer adds a non-existent message filter independently.

## Should-fix-before-merge (P1)

- **Still deferred: patient family persistence.** PR #81 keeps the canonical patient profile implementation and does not create or use `patient_family_members`; family management remains Phase 2 / `family_links` territory.
- **Still deferred: Emirates ID image persistence.** The URL columns and public document upload behavior are not included until a private storage/RLS/audit design is specified.
- **Still deferred: standalone billing/payment workflows.** `patient_invoices`, patient balances, mark-as-paid, and payment-like operations remain out of this safe port.
- **Still deferred: demo seeds and hardcoded production data rewrites.** PR #81 includes no new demo user/facility/doctor seed data and no hardcoded UUID appointment backfills.

## Nice-to-have (P2 / P3)

- Replace missing legacy logo image references with tracked assets. Included in PR #81 via `public/ceenaix-icon.png`.
- Keep dashboard query correctness fixes, message draft deep links, human-readable labels, appointment filters, PDF exports, and action menu fixes. Included in PR #81.
- Continue hardening clinic search UX around least-privilege RPCs if product wants clinics to book patients with no prior clinic relationship.

## Schema / RLS / Security Notes

- No direct OpenAI calls, service-role keys, or hardcoded secrets were found in the diff.
- No `: any`, `as any`, or `@ts-ignore` patterns were found in the diff.
- New SQL is consolidated into `20260614093000_safe_clinic_portal_expanded_port.sql`; it is idempotent, has no demo rows, and scopes policies by `auth.uid()`, facility membership, appointments, and doctor links.
- The migration adds safe support columns only where required by ported functionality: `facilities.settings`, `notifications.is_deleted`, and `messages.is_deleted`.
- PR #80's `patient_invoices`, hardcoded facility doctor links, hardcoded appointment backfill, and broad authenticated read policies are intentionally not included.

## Scope Findings

Included in PR #81:

- Clinic portal replacement: shell/sidebar/topbar, dashboard, doctors/invitations, appointments, patients, pricing/services, analytics, messages, notifications, and settings.
- Clinic-doctor connection flow: doctor join requests, clinic invitations, accept/decline/reject/suspend/remove states, notifications to doctors/clinic staff, and safe appointment facility linking.
- Patient/doctor fixes: appointment filters and action menus, patient detail labels, prescription/lab order PDF export via `jspdf`, patient document/lab result PDF export, records edit flow, dashboard query fixes, and message draft/deep-link improvements.
- E2E coverage updated to the replacement clinic portal and facility-linked appointment fixtures.

Still deferred:

- Billing/invoices/payment-like workflows.
- Family member persistence and non-canonical family tables.
- Emirates ID image persistence until private storage and audit behavior are designed.
- PR #80 demo data, hardcoded UUID data mutations, and old interleaved migration files.

## Verification

Passed locally on PR #81:

1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test -- src/lib/appointment-booking.test.ts src/pages/patient/Prescriptions.test.tsx src/pages/patient/Records.test.tsx src/pages/pharmacy/Dashboard.test.ts`
6. `npm run test:e2e -- e2e/clinic-portal.spec.ts`
