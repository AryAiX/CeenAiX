# CeenAiX Patient Mobile App — QA Test Report

QA branch: `mobile-patient-parity-tests` (tracks builder branch `mobile-patient-parity`).
Harness: Playwright against the Expo web export (`mobile/dist`), in `mobile-e2e/` (see `mobile-e2e/README.md`).
Projects: `iphone-14` (WebKit, 390x844), `pixel-7` (Chromium, 412x915), `rtl-ar` (Chromium, 412x915, locale `ar-AE`).

Last updated: 2026-10-28 (retest on `main` `dc86283`, see the section below). Earlier text: 2026-10-19. **Final run at builder commit `d388ee2`** (after the MB-010 to MB-016 fixes; `BUILD STATUS: COMPLETE`). Every screen in `docs/mobile/test-handoff.md` was retested at that commit, each fix was checked with targeted tests, and the full suite was run on all three projects. The earlier full run at `c843c4c` is superseded.

Every test also fails on unexpected console errors or page errors, and every screen spec checks document direction (LTR, or RTL in `rtl-ar`), no horizontal overflow at phone width, and accessible names on interactive controls. Screenshots are in `mobile-e2e/screenshots/{iphone-14,rtl-ar}/` (one per screen) and `mobile-e2e/screenshots/mb-*.png` (bugs).

Environment note: the DEV Supabase project is sometimes slow (2.5–3 s even for `/auth/v1/health`, with individual queries taking 5–10 s at peak). Tests use generous timeouts; this is not treated as an app defect.

## Retest on `main` (merge commit `dc86283`) with seeded DEV data — 2026-10-28

Build: `origin/main` at `dc86283` (QA branch `qa/mobile-main-seeded-retest`; `mobile/` exported with `npx expo export --platform web`, served with `APP_DIST`). DEV (`lgfaucsfiyxvmsghnpey`) now has migration `20260719090000` (MB-013) and the seeded smoke-patient data: lab order `…0921`, prescription `…0911`, a released MRI Brain imaging study (accession `IMG-22222222`) and the pharmacy "QA Al Noor Pharmacy". New spec: `mobile-e2e/tests/seeded-data.spec.ts` (4 tests × 3 projects, uses the existing testIDs).

**Full suite was run** on all three projects: 316 tests, **304 passed, 9 skipped (same intentional skips as before), 3 failed**. All 3 failures are the new lab detail check (below). No other test regressed. The old "uploads a real PDF to the vault and tries to remove it" test now passes on iphone-14.

| Check | iphone-14 | pixel-7 | rtl-ar |
|---|---|---|---|
| 1. MB-013: upload a PDF, remove it, still gone after reload, no "QA " documents left | pass | pass | pass |
| 2. Lab result detail for order `…0921` shows HbA1c | **fail (MB-017)** | **fail (MB-017)** | **fail (MB-017)** |
| 3. Prescription detail shows Amoxicillin; pharmacy picker lists QA Al Noor Pharmacy | pass | pass | pass |
| 4. Imaging list and detail show the MRI Brain study (accession IMG-22222222) | pass | pass | pass |

Notes:
- **MB-013 is fixed-verified on DEV.** Upload then Remove succeeds on every project. The document disappears and stays gone after a full reload. Afterwards the smoke patient has 0 live vault documents (the old "QA " leftovers are soft-deleted; this was also confirmed by querying `patient_document_files` as the patient). Each test removed its own upload.
- **Pharmacy picker:** assigning a pharmacy updates the prescription (`pharmacy_organization_id`) and the app has no way to undo it, so the test opened the picker, asserted `pharmacy-card-*` "QA Al Noor Pharmacy", and closed it with `btn-close-sheet` without assigning. The prescription still has `pharmacy_organization_id = null`, so "Send to pharmacy" can be retested. The assign action itself (and the "sent" state after it) is **not covered**.
- **Lab detail "Explain with AI"** (`btn-explain-with-ai`) is not reachable until MB-017 is fixed; the list card and detail header do load.
- Imaging and prescription data are real DEV rows, so these tests will break if the seed is changed.

### MB-017 — Seeded lab order shows no results: HbA1c is not visible to the patient

- Severity: P3 for the app, blocks QA of lab detail. Cause is DEV seed data, not `mobile/` code.
- Screen: Lab result detail (`/lab-results/22222222-3333-4333-8444-000000000921`)
- Steps: sign in as `smoke.patient@ceenaix.test`, Health › Lab results, open the card for `LAB-MOBILE-QA-001` (`lab-order-card-22222222-3333-4333-8444-000000000921`).
- Expected: the HbA1c item (abnormal), and "Explain with AI".
- Actual: the header, lab (Dubai Medical Laboratory), "Resulted" pill and "Ordered by Dr. Smoke Doctor" show, then an empty "Result" section with only "View linked visit" and "Share report". `btn-explain-with-ai` is absent because `resultedCount` is 0. The orders list shows the order, so the list query works.
- Evidence: `GET /rest/v1/lab_order_items?lab_order_id=eq.…0921` as the patient returns `[]` (any `lab_order_items` query returns `[]`). The order row has `status = 'resulted'` but `results_released_at = null`. The patient policy `patients_read_lab_items` (migration `20260719071500`) only exposes items when `lab_orders.results_released_at IS NOT NULL`, so RLS hides every item. The `lab_portal_imaging_studies` row (MRI Brain, `released`) is unaffected, which is why imaging passes.
- Fix (data): set `results_released_at = now()` (and ideally `sample_collection_at`) on lab order `…0921`, e.g. in `scripts/dev-mobile-qa-seed.sql` where the order is inserted/updated. I could not confirm in the DB that the HbA1c item row exists (RLS hides it from the patient), so check that too.
- Optional app follow-up (UX, not opened as a bug): a "Resulted" order whose items are all hidden shows a "Result" heading over nothing; an empty state would be clearer.
- Spec: `tests/seeded-data.spec.ts` › "lab result detail for the seeded order shows HbA1c" (fails on all 3 projects until the seed is fixed). Screenshot: `mobile-e2e/test-results/seeded-data-*lab-result-detail*/test-failed-1.png` (not committed).

## Per-screen results

| Screen | Commit tested | Result | Specs | Notes |
|---|---|---|---|---|
| App boot (web) | d388ee2 | pass | all | MB-001, MB-002, MB-003 and MB-008 fixed-verified: cold start paints a boot screen |
| Sign in (email + phone OTP mode) | d388ee2 | pass | `tests/auth.spec.ts` | MB-005 fixed-verified. Wrong password, validation, password toggle, links, signed-out redirect |
| Forgot password | d388ee2 | pass | `tests/auth.spec.ts` | Reset endpoint mocked (no real email) |
| Reset password | d388ee2 | pass | `tests/reset-password.spec.ts` | Without a recovery session: "request a new link" opens Forgot password. Setting a new password needs a real recovery link (not covered) |
| Phone OTP | d388ee2 | pass | `tests/auth.spec.ts` | SMS endpoints mocked. Wrong code, resend cooldown, digits stay LTR in Arabic |
| Sign up (email + phone) | d388ee2 | pass | `tests/auth.spec.ts` | Sign-up endpoint mocked (no account created). Every validation step, back, check-email state |
| Onboarding | d388ee2 | pass | `tests/role-gates.spec.ts` | Reached by rewriting the profile response to `profile_completed = false` (upserts stubbed). Routes are gated, name and terms validation, save lands on the dashboard |
| Patient only | d388ee2 | pass | `tests/role-gates.spec.ts` | Reached by rewriting the role to `doctor`: gate on every route, web-portal link, sign out. Failed profile lookup shows `state-profile-error`, and retry recovers |
| Dashboard | d388ee2 | pass | `tests/dashboard.spec.ts` | Real data (greeting, care team: Dr. Smoke Doctor), quick actions, tabs, skeleton, boot screen (MB-008), offline banner from cache, error + retry |
| Appointments (Visits) | d388ee2 | pass | `tests/appointments.spec.ts` | MB-007 fixed-verified. Status/type segments, past virtual visit 901, detail push and back, book, skeleton, error + retry |
| Appointment detail | d388ee2 | pass | `tests/appointment-flows.spec.ts` | Past visit 901 (no cancel/reschedule, follow-up message), upcoming booked visit (reschedule/cancel/pre-visit section), deep-link back, not-found, error + retry |
| Video visit lobby | d388ee2 | pass (web fallback) | `tests/appointment-flows.spec.ts` | Web shows the "requires the mobile app" state; close works. LiveKit call is native-only, not covered |
| Book appointment | d388ee2 | pass | `tests/appointment-flows.spec.ts` | Doctor search + empty state, Next gating per step, back, real booking with "Doctor Test" (each project uses a different date). Dr. Smoke Doctor has no published availability in DEV |
| Reschedule | d388ee2 | pass | `tests/appointment-flows.spec.ts` | Doctor step skipped, reason prefilled, new slot confirmed |
| Cancel appointment | d388ee2 | pass | `tests/appointment-flows.spec.ts` | Close button (MB-012), reason required, keep returns, confirm moves the visit to Cancelled. Each run cancels its own booking |
| Pre-visit intake | d388ee2 | pass | `tests/pre-visit.spec.ts` | DEV has no assessment for the smoke patient and no bookable doctor has a template, so the assessment row is mocked (writes stubbed, AI summary real). Every question type, required gating, back, review, complete, close confirm, not-found |
| AI assistant + history | d388ee2 | pass | `tests/assistant.spec.ts` | MB-009 fixed-verified. History sheet close button (MB-012). Consent allow/deny, context indicator, real `ai-chat` reply tagged "AI-generated", history sheet, new chat |
| Messages | d388ee2 | pass | `tests/messages.spec.ts` | 1 conversation, open thread and back, error state. Search only appears with more than 3 threads (by design, skipped) |
| Conversation | d388ee2 | pass | `tests/conversation.spec.ts` | Real send, edit (long-press), delete with undo, and delete; English text is LTR in Arabic (MB-009 verified here). An unknown thread id shows `state-empty-conversation` with no composer and a Messages action (MB-011 fixed). Leaving during the undo window sends the delete (MB-015 fixed) |
| My health hub | d388ee2 | pass | `tests/health.spec.ts` | MB-006 fixed-verified (back is "Back"). All 9 rows open the right screen and back returns |
| Medical records + record form | d388ee2 | pass | `tests/records.spec.ts` | Counts, filter, action sheet (3 types), required-field validation for each category, add/edit/remove a condition (soft delete), error state. Search only appears with more than 5 records (by design). Record form close button (MB-012). Arabic back button is just "رجوع" (MB-016) |
| Lab results | d388ee2 | pass (empty only) | `tests/lab-results.spec.ts` | Segments with `aria-selected`, empty states, back, error + retry. The smoke patient has no lab orders, so lab detail and "Explain with AI" are not reachable |
| Prescriptions | d388ee2 | pass | `tests/prescriptions.spec.ts` | Segments, empty states, add and remove a self-reported medicine (save gating, cancel/confirm dialog), back, error + retry. No prescriptions in DEV, so prescription detail and the pharmacy picker are not reachable |
| Imaging | d388ee2 | pass (empty only) | `tests/imaging.spec.ts` | Segments, empty state, back, error + retry. No studies in DEV, so imaging detail is not reachable |
| Documents | d388ee2 | fail (MB-013, fix pending DEV deploy) | `tests/documents.spec.ts` | Segments, list, error + retry. Real upload (iPhone run only) works; removing still fails on RLS because migration `20260719090000_patient_document_soft_delete_rls.sql` (ab64ac9) is not applied on DEV yet |
| Document upload | d388ee2 | pass | `tests/documents.spec.ts` | Camera row hidden on web, file chooser, save gating, files over 20 MB rejected, title prefilled from the file name. Labelled close button returns to Documents (MB-012) |
| Insurance | d388ee2 | pass | `tests/insurance.spec.ts` | No-plan state and its Profile action, claims list, status chips, benefits, error + retry. Note: cancelled visits are listed as "Denied" claims and counted in "You paid"; the web app does the same (parity, not filed) |
| Notifications | d388ee2 | pass | `tests/notifications.spec.ts` | Log with All/Unread, mark all read (button hidden when nothing is unread, by design), dashboard bell and back, error + retry. Some notification bodies mix Arabic dates into English text; they are generated by the backend trigger in the language of the session that booked |
| Profile | d388ee2 | pass | `tests/profile.spec.ts` | All sections render real data; edit then cancel discards; empty name blocks save; save keeps the values; dashboard avatar and back |
| Settings | d388ee2 | pass | `tests/settings.spec.ts` | Language switch shows the restart dialog and flips `dir` (then switches back), theme dark/system, email/SMS/pharmacy toggles persist across reload and are restored (iPhone run only), reset-password email (mocked), sign out (cancel/confirm, logout mocked) clears session and cached health data. No request gets 401 after sign-out (MB-014; 15 test repeats plus 8 scripted loops). Signing back in on the same page loads data again (regression check) |

### Final spec totals at `d388ee2` (full suite, all three projects)

Each project runs 101 tests (plus one shared sign-in setup). Two tests were added for the fixes: the record-form close button (MB-012) and signing back in after sign-out (MB-014 regression).

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| iphone-14 | 98 | 1 (MB-013, fix pending DEV deploy) | 2 |
| pixel-7 | 97 | 0 | 4 |
| rtl-ar | 98 | 0 | 3 |
| **Total** | **293** | **1** | **9** |

The only failure is the real document removal. It runs on iPhone only, and its backend fix isn't deployed to DEV yet. No regressions were found.

One full run before this one also failed the MB-015 test once on `rtl-ar`. The test waited a fixed 6 s after leaving the thread and then reloaded, so on a slow DEV the reload could abort the in-flight delete. The test now waits for the delete request itself and passed 15 of 15 repeats, plus the final full run.

Skips, all intentional:
- The OTP "digits stay LTR in Arabic" test runs only on `rtl-ar`.
- Messages search needs more than 3 conversations, and the smoke patient has 1.
- The real document upload and the shared-preference toggles run only on `iphone-14`. This keeps parallel projects from racing on the same account, and the upload can't be cleaned up while MB-013 is open.

### Test data left in DEV

- Bookings with "Doctor Test": each run books, reschedules and then cancels its own.
- Conditions, reported medicines and messages: each run removes its own.
- Profile and preferences: restored to their original values.
- Vault documents: removal is blocked until the MB-013 migration is on DEV. The smoke patient now has 9 "QA e2e upload …" documents from these runs, plus the builder's 2 "QA upload check" documents. They can be soft-deleted once the migration is live.

## Bugs

| ID | Severity | Screen | Status |
|---|---|---|---|
| MB-001 | P1 | Build | fixed-verified |
| MB-002 | P0 | Root layout | fixed-verified |
| MB-003 | P1 | Root error boundary | fixed-verified |
| MB-004 | P3 | Phone OTP | fixed-verified |
| MB-005 | P1 | Sign-in / root navigator | fixed-verified |
| MB-006 | P2 | Every pushed screen (header back) | fixed-verified |
| MB-007 | P3 | Segmented controls | fixed-verified |
| MB-008 | P3 | Cold start (web) | fixed-verified |
| MB-009 | P3 | Assistant + conversation (RTL) | fixed-verified |
| MB-010 | P3 | Pre-visit review | fixed-verified |
| MB-011 | P3 | Conversation (unknown id) | fixed-verified |
| MB-012 | P3 | Sheet screens (web) | fixed-verified |
| MB-013 | P2 | Documents (backend RLS) | fixed-verified on DEV at `dc86283` (2026-10-28) |
| MB-014 | P3 | Sign out | fixed-verified |
| MB-015 | P2 | Conversation (delete) | fixed-verified |
| MB-016 | P3 | Every pushed screen, Arabic (header back) | fixed-verified |
| MB-017 | P3 | Lab result detail (seed data: `results_released_at` is null, items hidden by RLS) | open (seed fix needed) |

### MB-001 — Web export fails: `react-dom` / `react-native-web` missing
- Severity: P1 (blocks all web/Playwright testing)
- Screen: build
- Status: **fixed-verified** in `f5bf5b0` (clean `npm ci` + `expo export --platform web` succeeds)
- Steps: `cd mobile && npm install && npx expo export --platform web`
- Expected: web bundle exported to `mobile/dist`.
- Actual (at `075d20c`): `CommandError: ... Install react-dom@19.3.0, react-native-web@^0.21.4`.

### MB-002 — App crashes on boot on web: `Notifications.useLastNotificationResponse()` throws
- Severity: P0 (blank screen on every route)
- Screen: root layout (`mobile/src/app/_layout.tsx`)
- Status: **fixed-verified** in `f5bf5b0`
- Steps: build web, open `/` at 390x844.
- Expected: sign-in screen.
- Actual (at `075d20c`): blank screen; swallowed error was `ExpoNotifications.getLastNotificationResponse is not available on web`.
- Screenshot: `mobile-e2e/screenshots/mb-002-root-crash.png`

### MB-003 — Root `ErrorBoundary` needs `ThemeProvider`, so any root error becomes an opaque crash
- Severity: P1
- Screen: root layout / `RouteErrorBoundary`
- Status: **fixed-verified** in `edfc1f5`, by code review: `useTheme` now falls back to the system palette outside the provider. A root error cannot be triggered from Playwright without fault injection.
- Actual (at `075d20c`): the boundary threw `useTheme must be used within ThemeProvider` and the original error was lost.

### MB-004 — Invalid style `direction` on the OTP cells (web console error)
- Severity: P3
- Screen: Phone OTP
- Status: **fixed-verified** in `f5bf5b0` (no console error; digits stay LTR in Arabic)

### MB-005 — After sign-in, a patient sees "This app is for patients" until the profile loads (and stays there if the profile query fails)
- Severity: P1
- Screen: sign-in → root navigator
- Status: **fixed-verified** in `0218ca2` + `c46a74a` (regression test passes on all 3 projects)
- Steps: sign out; sign in as the smoke patient.
- Expected: a loading state, then the dashboard.
- Actual (at `ed7bec0`): the patient-only screen showed for 5–8 s; in one run it stuck because `loadProfiles` ignored query errors.
- Spec: `tests/auth.spec.ts` › "MB-005: …"
- Screenshot: `mobile-e2e/screenshots/mb-005-patient-only-flash.png`

### MB-006 — Header back button is announced as "(tabs), back"
- Severity: P2 (accessibility)
- Screen: every pushed stack screen (records, labs, prescriptions, imaging, documents, insurance, notifications, profile, settings, appointment detail…)
- Status: **fixed-verified** in `36949f6` (tested at `c843c4c`): the back button is now named "Go back" on every pushed screen instead of "(tabs), back". At `d388ee2` it is "Back" in English and "رجوع" in Arabic (see MB-016)
- Steps: Health tab → Records; inspect the header back control (or use VoiceOver/TalkBack).
- Expected: an accessible name such as "Back" or "Back to My Health".
- Actual: the accessible name is `(tabs), back`; the native-stack back button uses the previous route's name, which is the `(tabs)` group. On native the back title has the same source.
- Fix: set `headerBackTitle` (or `title`) on the `(tabs)` screen in `src/app/(app)/_layout.tsx`, or set `headerBackAccessibilityLabel` / `headerBackButtonMenuEnabled` per screen.
- Spec: `tests/health.spec.ts` › "MB-006: …"
- Screenshot: `mobile-e2e/screenshots/mb-006-back-label.png`

### MB-007 — Segmented controls do not expose the selected segment on web
- Severity: P3 (accessibility, web)
- Screen: all `SegmentedControl` users (visits, records, labs, prescriptions, imaging, documents, insurance, notifications, settings, sign-in mode)
- Status: **fixed-verified** in `faa44e9` (tested at `c843c4c`): segments, booking choices and pre-visit options expose `aria-selected` / `aria-checked`
- Steps: Visits tab; inspect `segment-appointments-status-upcoming`.
- Expected: `aria-selected="true"` on the selected `role="tab"` (as the bottom tabs already do).
- Actual: no `aria-selected` on any segment. react-native-web 0.21 does not map `accessibilityState.selected`.
- Fix: pass `aria-selected={selected}` (or `accessibilityState` plus `aria-selected`) in `SegmentedControl` (`src/components/ui/form.tsx`).
- Spec: `tests/appointments.spec.ts` › "MB-007: …"
- Screenshot: `mobile-e2e/screenshots/mb-007-segment-selected.png`

### MB-008 — Cold start on web is a blank white page while the session and profile load
- Severity: P3 (web only; native shows the splash screen)
- Screen: root layout (`RootNavigator` returns `null` while `isLoading`)
- Status: **fixed-verified** in `c6cae45` (tested at `c843c4c`): the boot screen (`state-loading`) paints during the slow session/profile load
- Steps: open any route with a stored session on a slow network (the spec delays Supabase REST by 6 s).
- Expected: a branded loading state or skeleton.
- Actual: nothing is painted for the whole auth + profile load (about 10 s on DEV at peak).
- Fix: render a lightweight splash (logo + spinner/skeleton) instead of `null` on web.
- Spec: `tests/dashboard.spec.ts` › "MB-008: …"
- Screenshot: `mobile-e2e/screenshots/mb-008-cold-start-blank.png`

### MB-009 — In Arabic, English chat text has its punctuation on the wrong side
- Severity: P3 (RTL)
- Screen: AI assistant (user and assistant bubbles); likely conversation bubbles too
- Status: **fixed-verified** in `417d1cb` (tested at `c843c4c`): in `rtl-ar`, an English conversation message has computed `direction: ltr`. The assistant bubbles use the same `contentDirection` helper (code review)
- Steps: language Arabic; ask the assistant an English question.
- Expected: Latin-script content keeps its own direction ("…per minute.").
- Actual: the bubble text inherits RTL, so the trailing "." / "?" renders at the start (".ranges from 60 to 100 beats per minute", "?resting heart rate").
- Fix: render message text with `writingDirection: 'auto'` (on web, `dir="auto"`) instead of forcing the app direction.
- Screenshot: `mobile-e2e/screenshots/mb-009-rtl-bidi-punctuation.png`

### MB-010 — Pre-visit review shows raw option values instead of labels
- Severity: P3
- Screen: Pre-visit intake › review step (`mobile/src/app/(app)/pre-visit/[id].tsx`, review card renders `answer.answerText`)
- Status: **fixed-verified** in `6e38c05` (tested at `d388ee2`): the review shows "Mild", "Cough" and a localized yes/no on all 3 projects
- Steps: answer a single-select question with option label "Mild" (value `mild`) and a multi-select with "Cough" (`cough`); open the review.
- Expected: "Mild", "Cough" (the labels the patient picked, localized).
- Actual: "mild", "cough" (stored values). Yes/no answers display correctly.
- Fix: map select answers back through `question.options` to their labels for display.
- Spec: `tests/pre-visit.spec.ts` (soft assertions tagged MB-010)
- Screenshot: `mobile-e2e/screenshots/mb-010-previsit-review-values.png`

### MB-011 — Unknown conversation id shows an empty, writable thread
- Severity: P3
- Screen: Conversation (`/conversation/<id>`)
- Status: **fixed-verified** in `3be2857` (tested at `d388ee2`): `state-empty-conversation` shows with no composer, its Messages action works, and there is no mark-read 400
- Steps: open `/conversation/00000000-0000-4000-8000-000000000000` (or a stale deep link or push to a conversation the patient can't access).
- Expected: a not-found state, like appointment detail and pre-visit have, with no composer.
- Actual: the screen shows "No messages in this thread yet" with an active composer and the generic "Messages" title. The read-receipt RPC `mark_conversation_messages_read` fails with 400 "Conversation not found." (a console error).
- Fix: when the conversation isn't in `useConversationList` (and the thread query returns nothing), render a not-found `EmptyState`, hide the composer, and skip the mark-read RPC.
- Spec: `tests/conversation.spec.ts` › "unknown conversation id … (MB-011)"
- Screenshot: `mobile-e2e/screenshots/mb-011-unknown-conversation.png`

### MB-012 — Sheet screens have no close control on web
- Severity: P3 (web only; native has swipe-down and the grabber)
- Screen: every `formSheet` route with `headerShown: false`: document upload, record form, cancel appointment, pharmacy picker, assistant history
- Status: **fixed-verified** in `e8ada94` (tested at `d388ee2`): `btn-close-sheet` (named "Close") closes document upload, record form, cancel appointment and assistant history on all 3 projects. The pharmacy picker is not reachable (no prescriptions in DEV)
- Steps: Documents › Upload.
- Expected: a visible Close/Cancel control, or a header with a back button, as the pushed screens have.
- Actual: on web the only way out is the browser's back button. On native, VoiceOver and TalkBack users also benefit from an explicit close button.
- Fix: add a small sheet header with a close `IconButton` (with an accessibility label) on these screens, at least when `Platform.OS === 'web'`.
- Screenshot: `mobile-e2e/screenshots/mb-012-sheet-no-close.png`

### MB-013 — Removing a vault document fails: RLS on `patient_document_files`
- Severity: P2 (backend; same on the web app; already listed as a builder blocker)
- Screen: Documents
- Status: **fixed-verified** on 2026-10-28 at `dc86283` once the migration was applied to DEV (see the retest section at the top). Earlier status: migration `20260719090000_patient_document_soft_delete_rls.sql` (ab64ac9) is committed but not applied to DEV, so removal still fails with the same RLS error at `d388ee2`. This is expected, not a regression; retest after the migration ships
- Steps: upload a document, then Remove › confirm.
- Expected: the document is soft-deleted and disappears.
- Actual: 403 with `new row violates row-level security policy for table "patient_document_files"`; the document stays.
- Fix: the UPDATE policy on `patient_document_files` needs a `WITH CHECK` that allows the owner to set `is_deleted = true` / `deleted_at` (the soft-deleted row probably fails a `USING`/`WITH CHECK` that filters `is_deleted = false`).
- Spec: `tests/documents.spec.ts` › "uploads a real PDF to the vault and tries to remove it" (iPhone run)
- Screenshot: `mobile-e2e/screenshots/mb-013-document-remove-rls.png`

### MB-014 — After sign-out, a stale dashboard query fires and gets 401
- Severity: P3 (intermittent; about 1 in 3 sign-outs)
- Screen: Settings › Sign out
- Status: **fixed-verified** in `f5dfeaf` (tested at `d388ee2`): no request got 401 after sign-out in 15 spec repeats (5 per project) or 8 scripted loops, and signing back in on the same page loads data normally. The spec now fails on any late 401. Cosmetic leftover, not reopened: the URL still passes through `/(auth)` for a moment before `/sign-in`
- Steps: open the dashboard, then Settings › Sign out › confirm.
- Expected: no data requests after the session is cleared.
- Actual: sometimes a `user_profiles` lookup for the care-team doctors runs after sign-out and returns 401 (a console error). The URL also passes through `/(auth)` before `/sign-in`. Session and cached health data (`ceenaix.cache.v1.*`) are correctly cleared.
- Fix: cancel or ignore in-flight queries when the session becomes null (for example, gate hooks on `user` and abort on sign-out), and redirect straight to `/sign-in`.
- Spec: `tests/settings.spec.ts` › "sign out …". It records an `MB-014` annotation when the 401 occurs instead of failing intermittently.

### MB-015 — Leaving a thread during the 5-second undo window silently cancels a message delete
- Severity: P2 (the patient believes a message is deleted, but the doctor still sees it)
- Screen: Conversation
- Status: **fixed-verified** in `171ab18` (tested at `d388ee2`): leaving the thread during the undo window sends the delete, and the message stays gone after reopening (15 of 15 repeats plus the full run)
- Steps: long-press your own message › Delete; within 5 s tap back (or the app is backgrounded/killed); reopen the thread.
- Expected: the delete commits (or the undo bar says it was cancelled).
- Actual: the message is still there. The unmount cleanup in `conversation/[id].tsx` calls `clearTimeout(undoTimer)` without running the pending `thread.remove`.
- Fix: on unmount, flush the pending delete (call `thread.remove(pendingDelete)`) instead of only clearing the timer.
- Spec: `tests/conversation.spec.ts` › "MB-015: …" (cleans up its own message)
- Screenshot: `mobile-e2e/screenshots/mb-015-delete-reappears.png`

### MB-016 — In Arabic, the header back button is announced as "رجوع, back"
- Severity: P3 (accessibility, RTL)
- Screen: every pushed stack screen
- Status: **fixed-verified** in `e0d2772` (tested at `d388ee2`): the Arabic back button is named "رجوع" with no English "back"
- Steps: language Arabic; Health › Records; inspect the header back control (or use TalkBack/VoiceOver in Arabic).
- Expected: a fully Arabic name, such as "رجوع".
- Actual: `رجوع, back`. The native-stack header appends the English word "back" to the localized back title.
- Fix: set `headerBackAccessibilityLabel: t('m.common.back')` in the `(app)` stack `screenOptions`, next to `headerBackTitle`.
- Spec: `tests/records.spec.ts` › "renders category counts…" (RTL assertion tagged MB-016)
- Screenshot: `mobile-e2e/screenshots/mb-016-arabic-back-label.png`

## Not testable in Playwright (native-only)

Tracked as "native-only, not covered", not failures:
- LiveKit native video calls (the web build shows the "requires the mobile app" state, which is tested)
- camera capture and the native image picker
- the biometric app lock (`expo-local-authentication`)
- push notification registration, delivery and deep-link taps
- haptics
- the native share sheet (insurance card, imaging, document links)
- native `formSheet` detents, the grabber and swipe-to-dismiss
- the iOS swipe-back gesture and the Android hardware back button
- long-press menus with VoiceOver and TalkBack, and real screen-reader announcements
- keyboard avoidance

Data gaps in DEV (also not covered):
- lab result detail and "Explain with AI"
- prescription detail and the pharmacy picker
- imaging detail
- a real pre-visit template
- setting a new password from a real recovery link

**Recommendation:** add a small Maestro suite (or Detox) that runs on an EAS development build, on an iOS simulator and an Android emulator.
- It should cover sign-in with biometric unlock, a LiveKit join against a DEV virtual appointment, camera and library uploads, push registration plus a notification tap deep link, sheet dismissal and swipe-back, and share sheets.
- Reuse the existing `testID`s (Maestro `id:` selectors map directly).
- Seed DEV with one lab order, one prescription with a pharmacy, one imaging study, and a pre-visit template for "Doctor Test", so the detail screens can be covered in both suites.
