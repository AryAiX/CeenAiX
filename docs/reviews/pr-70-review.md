# PR #70 Review — Pharmacy completion + Patient portal bug fixes + Real-time notifications

| Field | Value |
|---|---|
| Title | feat: pharmacy portal completion + patient portal bug fixes & real-time notifications — pharmacy-fixes-v2 |
| URL | https://github.com/AryAiX/CeenAiX-10895ac7/pull/70 |
| Author | @Abud-ai |
| Branch | `pharmacy-fixes-v2` → `main` |
| Size | +4,139 / −749 across 34 files |
| State | OPEN, `reviewDecision = REVIEW_REQUIRED` |
| Mergeable | `MERGEABLE` (no Git conflicts) / `mergeStateStatus = BLOCKED` (review required) |
| CI | Lint, Typecheck & Build = ✅ PASS · Migration dry-run (PR) = ✅ PASS · Dev Supabase / Dev Deploy = SKIPPED (gated until merge) |

---

## Verdict

**REQUEST CHANGES — DO NOT MERGE AS-IS.**

CI is green and Git reports the branch as cleanly mergeable, but the diff has at least one **hard runtime regression** (the `picked_up` workflow status is written by the frontend but the missing migration that adds it to the `pharmacy_dispensing_tasks_status_chk` CHECK constraint is not in this PR — every "Mark as Picked Up" click will throw a constraint-violation error in production). The PR description even lists a migration file (`20260605000001_add_picked_up_status_to_dispensing_tasks.sql`) that is **not actually committed**. In addition, two new tables (`medication_reminders`, `patient_family_members`) sit in functionality the canonical schema explicitly flags as **Phase 2 — do not create in MVP**, several new patient/pharmacy flows make direct `supabase.from(...)` writes from page components instead of going through hooks (AGENTS.md violation), errors on clinical writes are silently swallowed (`catch { /* silently fail */ }`), and two of the new RLS policies open up `organization_members` and `user_profiles` reads to **every authenticated user** which is too broad for a healthcare PII surface. Once the missing migration is added and the over-broad RLS policies and silent-catch patterns are tightened, this PR is fine to merge as a squash to `main`.

---

## Merge-blockers (P0)

- **Missing migration for `picked_up` workflow status.** The PR description lists `supabase/migrations/20260605000001_add_picked_up_status_to_dispensing_tasks.sql`, but that file is **not in the diff and not on the branch**. The existing constraint `pharmacy_dispensing_tasks_status_chk` (from `20260427054000_add_pharmacy_insurance_ops_portal_data.sql`) only permits `('new','in_progress','on_hold','dispensed','cancelled')`. The new Patient Prescriptions handler `handleMarkPickedUp` runs `supabase.from('pharmacy_dispensing_tasks').update({ workflow_status: 'picked_up', ... })`, which will be rejected by Postgres at runtime. The "Mark as Picked Up" feature is fully wired in the UI (`src/pages/patient/Prescriptions.tsx`) but its DB write **cannot succeed**. The frontend hook `use-pharmacy-prescription-queue.ts` also still types `workflowStatus` without `'picked_up'`, so the read side will mis-narrow once the constraint is fixed.
  - Action: author must add a migration that drops + recreates `pharmacy_dispensing_tasks_status_chk` with `'picked_up'` included, in an idempotent `DO $$ ... $$;` block or `ALTER TABLE ... DROP CONSTRAINT IF EXISTS ... ; ALTER TABLE ... ADD CONSTRAINT ...` pattern, and re-export the union type in `PharmacyQueuePrescriptionItem.workflowStatus`.

- **Silent error swallowing on a clinical write.** `handleMarkPickedUp` ends with `} catch { /* silently fail */ }`. The user is shown an optimistic "✅ Picked Up" state via `setPickedUpIds(...)` even when the DB write fails. With the constraint bug above, **every user will see a fake success while the DB stays in `dispensed` state**. This is the worst failure mode for a clinical app — UI says "you picked up your medication" but the system of record disagrees. Same anti-pattern in `handleMessagePharmacy` (`} catch { navigate('/patient/messages'); }`). Surface errors via the existing error-banner pattern instead of swallowing.

- **Two new RLS policies grant authenticated reads too broadly.**
  - `20260601000003_add_patients_read_pharmacy_members_policy.sql` lets **every authenticated user** `SELECT *` from `organization_members` for any pharmacy organization (enumerating pharmacy staff `user_id`s and roles). The use case (patient → direct pharmacy conversation) only needs a single pharmacy staff `user_id` for the patient's *own* prescription target.
  - `20260601000004_add_patients_read_pharmacy_profiles_policy.sql` lets **every authenticated user** `SELECT *` from `user_profiles WHERE role = 'pharmacy'`, exposing full pharmacy-staff `user_profiles` rows (name, email, phone, address, emirates_id if present).
  - Mitigation: replace with either a `SECURITY DEFINER` RPC that returns just `(user_id, full_name)` for the pharmacy linked to the caller's active prescription, or scope the policy to only rows joined to a prescription/dispensing-task the caller owns.

## Should-fix-before-merge (P1)

- **Phase-2 features delivered without an explicit scope override.** `docs/agent/schema-reference.md` lists `medication_reminders` and `family_links` under **"Phase 2+ Tables (DO NOT create in MVP)"** and `docs/agent/mvp-scope.md` calls out "Family member accounts — Phase 2". This PR adds:
  - `supabase/migrations/20260605000002_create_medication_reminders.sql` — exactly the Phase-2 table by name.
  - `supabase/migrations/20260605000003_create_patient_family_members.sql` — same domain as the Phase-2 `family_links` table, but **renamed**, which also violates "Use the canonical schema from `docs/agent/schema-reference.md`. Do not create ad-hoc tables."
  - Action: get an explicit Phase-override sign-off from the product lead, **and** either (a) rename `patient_family_members` to `family_links` with the spec column shape, or (b) update `schema-reference.md` to canonize `patient_family_members` before merging the migration.

- **Direct Supabase writes from page components (AGENTS.md violation).** AGENTS.md mandates "Custom hooks for Supabase queries." New offenders:
  - `src/pages/patient/Dashboard.tsx` — `supabase.from('medication_logs').upsert(...)`
  - `src/pages/patient/Prescriptions.tsx` — `supabase.from('medication_logs').upsert(...)`, `supabase.from('pharmacy_dispensing_tasks').update(...)`, `supabase.from('prescription_items').update(...)`, plus an `organization_members` read.
  - `src/pages/pharmacy/Dispensing.tsx` — `supabase.from('notifications').insert(...)` and `supabase.from('messages').insert(...)` (via a `sendHoldNotificationAndMessage` helper that uses a dynamic `await import('../../lib/supabase')` — odd pattern, no reason for lazy import here).
  - Action: move these into `src/hooks/` (`use-medication-logs.ts`, `use-medication-reminders.ts`, `use-pharmacy-notifications.ts`, etc.) so the page bodies match the rest of the codebase.

- **Migration ordering is interleaved with already-merged `main` migrations.** The PR ships migrations at `20260601000001…000004` and `20260602000001…000002`, but `origin/main` already contains `20260601090000_bootstrap_facilities_if_missing.sql`, `20260601120000_clinic_portal_backend.sql`, `20260602120000_admin_clinics_and_doctor_invites.sql`, and `20260603120000_repair_clinic_demo_password.sql`. So when this PR lands, the new files will sort *before* migrations that were applied earlier in production. Supabase tracks by name, so the dry-run still passes, but the "filenames sort AFTER the latest existing migration" rule from the task brief is violated and any locally re-spun DB will run them in a different order than prod did. Recommend renaming `20260601*/20260602*` migrations in this PR with `20260606*` (or higher) prefixes before merge.

- **Missing idempotency on three new RLS policies.** `20260601000002`, `20260601000003`, and `20260601000004` all `CREATE POLICY` without a paired `DROP POLICY IF EXISTS ... ;` — re-running them on an environment that already has the policy will fail. Compare to `20260604000002_fix_patient_records_rls_soft_delete.sql` in the same PR which does the right thing.

- **New tables lack FK constraints to upstream clinical rows.** `medication_logs.prescription_item_id`, `medication_reminders.prescription_item_id` are typed `uuid NOT NULL` with no `REFERENCES public.prescription_items(id) ON DELETE CASCADE`. If a prescription item is ever (soft-)removed or replaced, orphaned reminder/log rows linger. At minimum add the FK with `ON DELETE CASCADE` (cascading is OK here because these are derived state, not clinical records of record).

- **Optimistic UI without rollback.** `handleMarkScheduleTaken` in `src/pages/patient/Prescriptions.tsx` immediately calls `setLocallyTakenScheduleIds((prev) => new Set([...prev, key]))` *before* awaiting the `upsert`, and only sets the DB-confirmed set if `!error`. The local set is never rolled back on error, so the dose stays marked "taken" in the UI even when the DB write fails (no surfaced error either). Mirror the DB result back to the local set, or show an error toast on failure.

## Nice-to-have (P2 / P3)

- `signOut` in `src/lib/auth-context.tsx` uses `window.location.href = '/'` instead of React Router's `navigate('/')`. Works, but loses SPA state and triggers a full reload. P3.
- `src/pages/patient/Profile.tsx` and `src/pages/patient/Prescriptions.tsx` still spinner-load instead of skeleton-load in places. Existing pattern, noted in AGENTS.md as the preferred style. P2.
- `patient_family_members.date_of_birth` is `text`, not `date`. P2.
- `patient_family_members.emirates_id` is plain `text`. The canonical `user_profiles.emirates_id` is "encrypted" per `schema-reference.md`. If we keep this table, match that convention. P1 if we're storing real Emirates IDs, P2 if it's just a free-text label.
- Three inline `style={{ clipPath: 'inset(50%)' }}` honeypot inputs in `src/pages/public/Home.tsx` — acceptable use of inline style for screen-reader-hidden inputs; flagging only because AGENTS.md is strict about no inline styles. Move to a Tailwind utility (`[clip-path:inset(50%)]`) if you want zero inline. P3.
- `src/components/PortalShell.tsx` cross-portal session banner: spot-checked OK, matches the manager-reported requirement.
- Demo password `1234567!` — confirmed **not committed in source**. Search of the diff finds zero occurrences; only docs/runbook reference, which is the correct location.
- No `: any`, `as any`, or `// @ts-ignore` introduced. ✅
- No direct OpenAI / `sk-…` keys or service-role tokens in the diff. ✅

## Conflict report

- **Against `main` (HEAD `35ad037`):** `git merge-tree` produces a clean merge — no `<<<<<<<` markers, GitHub reports `mergeable = MERGEABLE`. The only "BLOCKED" signal is `mergeStateStatus = BLOCKED`, which is the required-review gate, not a Git conflict.
- **Against `5-26-w3` (HEAD `13f2577`):** `5-26-w3` is an **ancestor of `main`** (`git merge-base origin/main origin/5-26-w3` returns the `5-26-w3` HEAD, and `origin/main..origin/5-26-w3` is empty). It has no commits ahead of main, so there is no live overlap to worry about — anything in this PR that touches a file `5-26-w3` also touched has already been resolved in `main`.
- **Other branches touched in the last 14 days:** `origin/cursor/landing-page-fixes-3d22`, `origin/cursor/pharmacy-pr58-fixes-3d22`, `origin/clinic-portal`, `origin/landing-page` — none of them produce non-empty `diff --stat` against `main` for the files this PR touches; their work is already merged. No live conflict surface.
- Conclusion: **no Git conflicts anywhere in the active branch set.** All blockers in this review are content / logic / scope issues, not merge mechanics.

## Migration review summary

| File | New table / change | RLS enabled | RLS scoped by `auth.uid()` | Idempotent | Notes |
|---|---|---|---|---|---|
| `20260601000001_extend_pharmacy_facility_profiles.sql` | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ×7 | n/a (existing table) | n/a | ✅ | Safe additive change. |
| `20260601000002_add_pharmacy_settings_update_policy.sql` | `CREATE POLICY` on `pharmacy_settings` | already on | ✅ via `is_current_user_ops_org()` | ❌ no `DROP POLICY IF EXISTS` | P1 idempotency. |
| `20260601000003_add_patients_read_pharmacy_members_policy.sql` | `CREATE POLICY` SELECT on `organization_members` | already on | ❌ **opens to ALL authenticated users** | ❌ no `DROP IF EXISTS` | **P0 — too broad.** |
| `20260601000004_add_patients_read_pharmacy_profiles_policy.sql` | `CREATE POLICY` SELECT on `user_profiles` | already on | ❌ **opens to ALL authenticated users** | ❌ no `DROP IF EXISTS` | **P0 — too broad, leaks staff PII.** |
| `20260602000001_add_patient_user_id_to_dispensing_tasks.sql` | `ADD COLUMN IF NOT EXISTS patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` | n/a | n/a | ✅ | OK. |
| `20260602000002_update_fn_create_pharmacy_dispensing_tasks_patient_user_id.sql` | `CREATE OR REPLACE FUNCTION` trigger | n/a | n/a | ✅ | `SECURITY DEFINER`, sets `search_path = 'public'`. OK. |
| `20260604000001_create_medication_logs.sql` | new table | ✅ `ENABLE ROW LEVEL SECURITY` | ✅ `patient_id = auth.uid()` | n/a (CREATE TABLE) | P1: no FK on `prescription_item_id`. |
| `20260604000002_fix_patient_records_rls_soft_delete.sql` | replace policies on `allergies`, `medical_conditions`, `vaccinations` | already on | ✅ `auth.uid() = patient_id` (FOR ALL) | ✅ `DROP POLICY IF EXISTS` used | **Correctly permits soft-delete** because the new policy is `FOR ALL` with no `NOT is_deleted` clause; the `is_deleted = true` UPDATE will pass both `USING` and `WITH CHECK`. ✅ |
| `20260605000002_create_medication_reminders.sql` | new table | ✅ | ✅ `patient_id = auth.uid()` | n/a | **P1 scope — Phase 2 feature.** No FK on `prescription_item_id`. |
| `20260605000003_create_patient_family_members.sql` | new table | ✅ | ✅ `patient_id = auth.uid()` | n/a | **P1 scope — Phase 2 feature, also wrong table name vs canonical `family_links`.** P1 PII: emirates_id stored plaintext. |
| `20260605000001_add_picked_up_status_to_dispensing_tasks.sql` | **claimed in PR body, NOT committed** | — | — | — | **P0 BLOCKER — missing migration; `picked_up` writes will violate CHECK constraint.** |

- **No destructive ops** (DROP TABLE / TRUNCATE / mass UPDATE without WHERE) in any of these migrations. ✅
- **All `CREATE TABLE` migrations have `ENABLE ROW LEVEL SECURITY` + at least one ALL-verb policy scoped via `auth.uid()`**, satisfying the AGENTS.md rule for table creation. ✅
- The two over-broad policies on `organization_members` / `user_profiles` are the privacy concern, not the RLS-enabled-or-not concern.

## Security / privacy findings

- **No hardcoded credentials, JWTs, service-role keys, or OpenAI API keys** in the diff. ✅
- **Demo passwords (`1234567!`) are NOT in source code** — confirmed via diff search; documentation only. ✅
- **PII over-exposure via RLS** — covered above; the two `patients_read_pharmacy_*` policies grant SELECT on staff identity tables to every authenticated user. This is the only real privacy issue in the PR.
- **Storage buckets**: profile-image and Emirates-ID image uploads in `src/pages/patient/Profile.tsx` target the `avatars` and `documents` buckets. Did not deep-audit the storage policies (they aren't part of this diff); confirm with the existing storage migration that:
  - `documents` bucket policy paths are namespaced per-user (e.g. `documents/<auth.uid>/…`) and require `auth.uid()` ownership, and
  - `avatars` is either public-read with per-user write, or fully authenticated. Worth a follow-up audit but not a P0 for this PR.
- `prescription_item_id` rows in `medication_logs` / `medication_reminders` are accessible only to `patient_id = auth.uid()`, so even though there's no FK there's no cross-patient leak via these tables themselves.
- Patient → pharmacy messaging path uses `supabase.rpc('ensure_direct_conversation', { p_other_user_id, p_subject })` (existing RPC). Did not re-audit the RPC; ensure it does not allow arbitrary patient-to-arbitrary-user conversation creation if the `organization_members` policy gets tightened above.

## Functional sanity (spot-checks)

| Area | Files spot-checked | Looks legit? | Notes |
|---|---|---|---|
| Patient Dashboard (medication-taken persistence) | `src/pages/patient/Dashboard.tsx`, `src/hooks/use-patient-dashboard.ts`, `20260604000001_create_medication_logs.sql` | Yes, except direct `supabase.from` in page. Daily reset via `UNIQUE (patient_id, prescription_item_id, taken_date)` + `taken_date DEFAULT CURRENT_DATE` works. | Optimistic-without-rollback noted above. |
| Patient Appointments (calendar/directions/messages) | `src/pages/patient/Appointments.tsx` | Yes. Filter-by-status sections, auto-dismiss banners, directions modal, calendar export, message-doctor draft pre-fill all present. | Big file, low-risk UI logic. |
| Patient Records (soft-delete RLS) | `src/pages/patient/Records.tsx`, `20260604000002_*.sql` | Yes. RLS now permits the soft-delete UPDATE. Confirmation modal + required/optional labels present. | Cleanest part of the PR. |
| Patient Notifications (filters/dismiss/refresh) | `src/pages/patient/Notifications.tsx` | Yes. | — |
| Patient Documents (clickable stats + sort + portal modal) | `src/pages/patient/Documents.tsx` | Yes. | — |
| Patient Prescriptions (mark-taken + picked-up + message pharmacy) | `src/pages/patient/Prescriptions.tsx`, `use-patient-prescriptions.ts` | **Partially broken** — picked_up write will fail at constraint level. Schedule mark-taken works for happy path but is optimistic-only. Message-pharmacy handler swallows lookup errors. | See P0/P1. |
| Patient Profile (image uploads, family, save spinners) | `src/pages/patient/Profile.tsx`, `20260605000003_*.sql` | Yes mechanically. | Phase-2 scope and emirates_id plaintext flagged. |
| Pharmacy Dispensing (hold w/ notify + dispense + view modal) | `src/pages/pharmacy/Dispensing.tsx` | Yes. The `sendHoldNotificationAndMessage` helper does correct dual-write (notification + conversation message). | Move out of page component; remove dynamic `await import`. |
| Pharmacy Messages route | `src/lib/router.tsx`, `src/pages/pharmacy/Messages.tsx` | Yes — adds `/pharmacy/messages/:conversationId` for deep-link from Dispensing. | — |
| Pharmacy Profile (license modal, staff CRUD, logo upload, contact + working hours) | `src/pages/pharmacy/Profile.tsx`, `20260601000001_*.sql` | Yes. New columns covered by `pharmacy_facility_profiles` `ALTER` migration. | — |
| Pharmacy Settings (UPDATE policy) | `src/pages/pharmacy/Settings.tsx`, `20260601000002_*.sql` | Yes. UPDATE policy scoped via `is_current_user_ops_org`. | Missing `DROP POLICY IF EXISTS`. |
| Auth + Cross-portal session banner | `src/lib/auth-context.tsx`, `src/pages/auth/Login.tsx`, `src/components/PortalShell.tsx` | Yes. Banner only shows when authenticated user has `selectedRole` mismatched with `role`. SignOut redirects to `/`. | P3 — use `navigate('/')` instead of `window.location.href`. |
| Landing hero (Bolt redesign) + lead capture | `src/pages/public/Home.tsx`, `src/components/LandingDemoLaunchSection.tsx` | Yes. Hero `HeroDemoForm` posts to `/functions/v1/leads/demo-request` edge function; launch-notify form posts to `/functions/v1/leads/launch-notify`. No direct OpenAI / 3rd-party calls. | Inline style for honeypot — see P3. |

No obvious regressions (removed null-checks, dead routes, broken type narrowings beyond the `picked_up` issue) were spotted.

---

## Recommended merge plan

1. **Author adds the missing migration `20260606xxxxxx_add_picked_up_status_to_dispensing_tasks.sql`** (use a new timestamp ≥ the most recent migration on `main`, *not* the originally claimed `20260605000001`), with an idempotent `ALTER TABLE public.pharmacy_dispensing_tasks DROP CONSTRAINT IF EXISTS pharmacy_dispensing_tasks_status_chk; ALTER TABLE … ADD CONSTRAINT … CHECK (workflow_status IN ('new','in_progress','on_hold','dispensed','picked_up','cancelled'));`.
2. **Author tightens the two over-broad RLS policies** (`patients_read_pharmacy_members`, `patients_read_pharmacy_profiles`) — either rewrite as `SECURITY DEFINER` RPCs returning the minimum needed shape (e.g. `(pharmacy_user_id, full_name)` for the pharmacy linked to a prescription the caller owns) or scope the `USING` clause to rows joined to a `prescriptions` / `pharmacy_dispensing_tasks` row owned by the caller.
3. **Author replaces `catch { /* silently fail */ }` patterns** in `handleMarkPickedUp`, `handleMessagePharmacy`, and the hold-notification block with surfaced errors (banner / toast) **and** rollback of optimistic local state (`setPickedUpIds`, `setLocallyTakenScheduleIds`) on failure.
4. **Author renames the early-June migrations** (`20260601000001…000004`, `20260602000001…000002`) to `20260606*` timestamps so they sort after the migrations already merged to `main`. (Optional but recommended; the dry-run passes either way.)
5. **Author adds `DROP POLICY IF EXISTS` to** `20260601000002`, `20260601000003`, and `20260601000004` (or the renamed versions after step 4).
6. **Author confirms Phase-2 override with product lead** for `medication_reminders` and family-member CRUD; if approved, also update `docs/agent/schema-reference.md` to canonize `medication_reminders` and either rename `patient_family_members` → `family_links` with the spec column shape, or document the new name there. If product says "Phase 2, defer it" — split those two migrations + the Profile family-member UI + Prescriptions reminder UI into a follow-up PR behind a feature flag.
7. **Move the new direct-Supabase writes into hooks** under `src/hooks/` (`use-medication-logs.ts`, `use-pharmacy-notifications.ts`, …) and re-import from the page components. Required by AGENTS.md; can be the same PR or a quick follow-up depending on reviewer appetite.
8. **Re-run CI** (`Lint, Typecheck & Build`, `Migration dry-run (PR)`).
9. **Request a fresh review pass** from a second reviewer focused on the RLS rewrite and the missing migration.
10. **Squash-merge to `main`.** (Branch is currently +90 commits, all very small / noisy — squash is the right choice.)
11. **Run the prod Supabase migration workflow** (`Supabase Migrations / Migration apply`) against the production project, watch for failure on the `picked_up` constraint migration (it should be a no-op if a prior partial deploy already exists, hence the `DROP CONSTRAINT IF EXISTS`).
12. **Smoke-test in dev** before promoting:
    - Patient → mark a dose taken on Dashboard, hard-refresh, dose persists.
    - Patient → mark prescription picked up; row in `pharmacy_dispensing_tasks` flips to `workflow_status = 'picked_up'`.
    - Pharmacy → place a row on hold; verify the patient receives both a `notifications` row and a `messages` row in the patient↔pharmacy conversation.
    - Patient → soft-delete an allergy/condition/vaccination row; row's `is_deleted` flips to `true` (or whichever column the UI uses) without RLS rejection.
    - Cross-portal: sign in as patient, navigate to `/pharmacy/messages` — verify the amber sign-out banner appears.

## Open questions for the author

1. Where is the missing `20260605000001_add_picked_up_status_to_dispensing_tasks.sql`? Was it dropped from a rebase, never committed, or applied via a one-off SQL in dev that wasn't backported?
2. Has product explicitly approved bringing `medication_reminders` and family-member management forward from Phase 2 into the MVP cut? If yes, can `docs/agent/schema-reference.md` and `docs/agent/mvp-scope.md` be updated in this PR (or a sibling PR) so future reviewers don't trip on the same scope rule?
3. Why is `patient_family_members` used instead of the canonical `family_links` name from the spec? Is the column shape diverging from the spec intentionally?
4. The `emirates_id` column on `patient_family_members` is stored as plain `text`. Is the intent to apply the same encryption-at-rest treatment as `user_profiles.emirates_id`, and if so, when?
5. Was the dynamic `await import('../../lib/supabase')` in `src/pages/pharmacy/Dispensing.tsx` intentional (e.g. to defer for code splitting) or a leftover from extracting the helper out of the component file?
6. For the two new SELECT policies (`patients_read_pharmacy_members`, `patients_read_pharmacy_profiles`), what was the intended scope? If the goal is "patient can find the pharmacy that holds their prescription," an `EXISTS (... pharmacy_dispensing_tasks WHERE patient_user_id = auth.uid() AND organization_id = organization_members.organization_id ...)` subquery would be a strictly tighter fit.
