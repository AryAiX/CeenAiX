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

PR #80 is CI-green and has no Git conflict, but it is too large and too clinic-heavy to merge directly into the current release line. The useful patient/doctor polish is mixed with a replacement clinic portal, broad clinic/facility RLS changes, billing/invoice schema, hardcoded demo facility IDs, and Phase 2/3 flows. The safe approach is a new branch from latest `origin/main` that ports only small, independently testable fixes.

---

## Merge-blockers (P0)

- **Clinic and facility work is out of MVP scope and still described as in progress.** `docs/agent/mvp-scope.md` lists Guest, Patient, Doctor, and minimal Super Admin as MVP roles. Clinic/facility administration and pharmacy are Phase 3 in the agent docs. PR #80 replaces most clinic pages and routing, adds clinic notifications/messages/analytics/pricing/settings, and changes facility-staff flows. This needs product sign-off and a dedicated clinic PR, not a mixed bug-fix PR.
- **Hardcoded production data mutations.** `20260610000001_link_doctors_to_clinic_facility.sql` inserts fixed UUIDs into `facility_staff`, and `20260611000000_link_appointments_to_facility.sql` updates existing appointments to a fixed facility ID. This is unsafe for shared environments and could relink clinical appointments unexpectedly.
- **Over-broad clinic RLS policies expose healthcare identity data.** Examples include `clinic_search_patients`, `clinic_search_doctors`, `authenticated_read_active_staff_links`, and `authenticated_read_active_clinic_members`. Several policies grant broad authenticated reads or clinic-wide patient/doctor search without appointment-linked scoping. Healthcare PII reads must be narrowly tied to the caller's role, facility membership, and patient care relationship.
- **Privileged RPC can approve arbitrary doctor/facility links.** `approve_doctor_and_link_appointments` is `SECURITY DEFINER` and grants execute to all authenticated users, but the function body does not validate that the caller manages `p_facility_id` or that `p_staff_id` belongs to that facility and doctor. That can become an authorization bypass.
- **New billing table is Phase 2/3 scope and deletes clinical-adjacent data.** `patient_invoices` is outside MVP billing scope, references `facilities` (Phase 3), and uses `ON DELETE CASCADE` from `facilities` / `user_profiles`. For healthcare and financial records, prefer soft-delete/auditable lifecycle, not cascaded hard deletes.
- **Doctor dashboard change queries a non-existent column.** PR #80 adds `.eq('is_deleted', false)` to a `messages` query in `use-doctor-dashboard.ts`, but the canonical `messages` table from `20260228000005_messaging.sql` has no `is_deleted` column. That would turn the dashboard message preview query into a runtime PostgREST error.

## Should-fix-before-merge (P1)

- **Migration timestamps are interleaved with current main.** PR migrations start at `20260610000000`, while `origin/main` already contains later `20260607*` and active release work. Any safe-port migrations should use fresh timestamps after the latest current migration and be idempotent.
- **Several `CREATE POLICY` migrations are not idempotent.** They do not `DROP POLICY IF EXISTS` before creating replacement policies, so reruns can fail.
- **Patient family persistence is not safe to port.** The PR writes `patient_family_members` from `PatientProfile` and hard-deletes rows with `.delete()`. Family member accounts are Phase 2 in `mvp-scope.md`, `patient_family_members` is not canonical in `schema-reference.md`, and clinical/personal records should not be hard-deleted.
- **Emirates ID image columns need a storage/security design.** The PR adds `emirates_id_front_url` and `emirates_id_back_url` to `user_profiles`. The idea aligns with patient profile scope, but it stores document URLs without a documented private-storage policy review or consent/audit behavior.
- **Large UI rewrites make review difficult.** Many doctor/patient pages receive broad UX changes and new dependencies such as `jspdf`. PDF export can be valuable, but it should be ported per workflow with tests, not via a 172-commit mixed PR.

## Nice-to-have (P2 / P3)

- Replace missing legacy logo image references with tracked assets.
- Keep small dashboard query correctness fixes, such as loading all active prescription items before computing patient adherence.
- Review patient/doctor action-button improvements individually, especially message draft deep links and navigation/dropdown fixes.

## Schema / RLS / Security Notes

- No direct OpenAI calls, service-role keys, or hardcoded secrets were found in the diff.
- No `: any`, `as any`, or `@ts-ignore` patterns were found in the diff.
- The risk is mainly authorization and data lifecycle: broad clinic read policies, an under-checked `SECURITY DEFINER` function, hardcoded facility data, and cascaded deletes on financial/clinical-adjacent rows.
- New tables and policies should be redesigned against the canonical schema, with `auth.uid()` scoping and appointment/facility membership checks that do not expose unrelated patients or staff.

## Scope Findings

Safe MVP-aligned areas:

- Patient and doctor dashboard/read-path correctness fixes.
- Patient and doctor navigation/action binding fixes that do not require new schema.
- Human-readable status labels and broken asset references.
- Existing-table RLS corrections, only when narrowly scoped and idempotent.

Defer from this PR:

- Clinic portal replacement and clinic-doctor invitation workflows.
- Pharmacy/facility expansion unless already isolated in the current release line.
- Billing, invoices, analytics revenue, patient balances, and payment-like workflows.
- Family member persistence and any new non-canonical family table.
- Emirates ID document storage until private storage/RLS/audit behavior is specified.

## Recommended Safe-port Plan

1. Create a replacement branch from latest `origin/main`; do not merge or cherry-pick the whole PR.
2. Port only small, independent fixes that compile without new schema or new dependencies.
3. Avoid all PR #80 migrations for now. Reintroduce any needed DB changes later with fresh timestamps, idempotent policies, and narrow RLS.
4. Defer the clinic portal work into a dedicated Phase 3 branch with a security review of facility membership, patient search, appointment linking, and privileged RPCs.
5. Run `npm run lint`, `npm run typecheck`, and `npm run build` before opening the replacement PR.
