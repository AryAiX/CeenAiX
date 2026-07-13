# Responsive Interaction Audit — 2026-07-03

## Scope

This report extends the route-level responsive audit with interaction-level Playwright coverage. The automated suite uses the existing mocked Supabase/auth fixtures and avoids live Supabase data, schema changes, and destructive production-like side effects.

Viewport coverage:

- [x] Mobile 390x844
- [x] Mobile 360x740
- [x] Tablet 768x1024

Automated specs:

- [x] `e2e/responsive.spec.ts` — route-level no-overflow coverage for public/auth plus patient, doctor, admin, lab, pharmacy, insurance, and clinic routes at mobile widths.
- [x] `e2e/responsive-interactions.spec.ts` — safe interaction-state coverage across the same role groups at mobile and tablet widths.

## Coverage Checklist

Public and auth:

- [x] Doctor directory search/filter layout.
- [x] Clinic directory card action layout.
- [x] Guest AI chat composer layout.
- [x] Login form field layout.
- [x] Register role-control layout.

Patient:

- [x] Appointment status tabs.
- [x] Records add-condition form state.
- [x] Lab result tabs and report share modal.
- [x] Messages conversation/composer layout.
- [x] Settings security panel.

Doctor:

- [x] Appointments list/search and pending request tabs.
- [x] Appointment detail scribe tab.
- [x] Appointment cancellation modal open/close layout.
- [x] Prescription medication search form.
- [x] Lab order test search and selected-test state.

Super admin:

- [x] Patient directory search/filter tabs.
- [x] Doctor directory search/filter tabs.
- [x] Organization onboarding modal.
- [x] Insurance partner tabs.

Lab:

- [x] Lab portal mobile navigation.
- [x] Result-entry worklist link state.
- [x] Radiology cards and placeholder workflow layout.

Pharmacy:

- [x] Dispensing queue search.
- [x] Sort dropdown.
- [x] Hold modal open/close layout.

Insurance:

- [x] Dashboard urgent pre-auth CTA layout.
- [x] Pre-auth queue filter tabs.
- [x] Reports chart mode buttons.

Clinic:

- [x] Invite doctor modal and search field.
- [x] Appointment search/status filters.
- [x] Book appointment modal open/close layout.
- [x] Pricing/service controls.

## Fixes Made

- Public header desktop navigation now waits until the large breakpoint, preventing tablet-width overflow when language and patient/doctor role buttons are visible.
- Shared public footer now uses two columns at tablet widths and four columns only at the large breakpoint, preventing below-the-fold horizontal scroll on public pages.
- Admin organization onboarding modal now caps to the viewport and scrolls internally, so long forms remain usable at 360/390 mobile widths.

## Remaining Manual Items

These controls are intentionally not submitted by the responsive sweep because they mutate workflow state or depend on browser/device capabilities beyond layout:

- [ ] Final appointment cancellation/reschedule submissions.
- [ ] Admin create organization, invite doctor, and verification/suspension submissions.
- [ ] Doctor save prescription, save lab order, consultation note approval, and status mutation submissions.
- [ ] Insurance approve/bulk-approve pre-authorizations and claim/fraud resolution actions.
- [ ] Pharmacy dispense, confirm hold, pickup, and cancellation transitions.
- [ ] File upload, camera/microphone, barcode scan, and live AI scribe recording flows.

Closest automated coverage is included by opening the relevant modal, tab, dropdown, form, or search state without submitting irreversible or side-effect-heavy actions.
