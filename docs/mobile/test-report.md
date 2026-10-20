# CeenAiX Patient Mobile App — QA Test Report

QA branch: `mobile-patient-parity-tests` (tracks builder branch `mobile-patient-parity`).
Harness: Playwright against the Expo web export (`mobile/dist`), in `mobile-e2e/` (see `mobile-e2e/README.md`).
Projects: `iphone-14` (WebKit, 390x844), `pixel-7` (Chromium, 412x915), `rtl-ar` (Chromium, 412x915, locale `ar-AE`).

Last updated: 2026-10-19. **Final run at builder commit `c843c4c` (`BUILD STATUS: COMPLETE`)**: every screen in `docs/mobile/test-handoff.md` was tested at its latest commit, and the full suite was run once on all three projects.

Every test also fails on unexpected console errors or page errors, and every screen spec checks document direction (LTR, or RTL in `rtl-ar`), no horizontal overflow at phone width, and accessible names on interactive controls. Screenshots are in `mobile-e2e/screenshots/{iphone-14,rtl-ar}/` (one per screen) and `mobile-e2e/screenshots/mb-*.png` (bugs).

Environment note: the DEV Supabase project is sometimes slow (2.5–3 s even for `/auth/v1/health`, with individual queries taking 5–10 s at peak). Tests use generous timeouts; this is not treated as an app defect.

## Per-screen results

| Screen | Commit tested | Result | Specs | Notes |
|---|---|---|---|---|
| App boot (web) | c843c4c | pass | all | MB-001, MB-002, MB-003 and MB-008 fixed-verified: cold start paints a boot screen |
| Sign in (email + phone OTP mode) | c843c4c | pass | `tests/auth.spec.ts` | MB-005 fixed-verified. Wrong password, validation, password toggle, links, signed-out redirect |
| Forgot password | c843c4c | pass | `tests/auth.spec.ts` | Reset endpoint mocked (no real email) |
| Reset password | c843c4c | pass | `tests/reset-password.spec.ts` | Without a recovery session: "request a new link" opens Forgot password. Setting a new password needs a real recovery link (not covered) |
| Phone OTP | c843c4c | pass | `tests/auth.spec.ts` | SMS endpoints mocked. Wrong code, resend cooldown, digits stay LTR in Arabic |
| Sign up (email + phone) | c843c4c | pass | `tests/auth.spec.ts` | Sign-up endpoint mocked (no account created). Every validation step, back, check-email state |
| Onboarding | c843c4c | pass | `tests/role-gates.spec.ts` | Reached by rewriting the profile response to `profile_completed = false` (upserts stubbed). Routes are gated, name and terms validation, save lands on the dashboard |
| Patient only | c843c4c | pass | `tests/role-gates.spec.ts` | Reached by rewriting the role to `doctor`: gate on every route, web-portal link, sign out. Failed profile lookup shows `state-profile-error`, and retry recovers |
| Dashboard | c843c4c | pass | `tests/dashboard.spec.ts` | Real data (greeting, care team: Dr. Smoke Doctor), quick actions, tabs, skeleton, boot screen (MB-008), offline banner from cache, error + retry |
| Appointments (Visits) | c843c4c | pass | `tests/appointments.spec.ts` | MB-007 fixed-verified. Status/type segments, past virtual visit 901, detail push and back, book, skeleton, error + retry |
| Appointment detail | c843c4c | pass | `tests/appointment-flows.spec.ts` | Past visit 901 (no cancel/reschedule, follow-up message), upcoming booked visit (reschedule/cancel/pre-visit section), deep-link back, not-found, error + retry |
| Video visit lobby | c843c4c | pass (web fallback) | `tests/appointment-flows.spec.ts` | Web shows the "requires the mobile app" state; close works. LiveKit call is native-only, not covered |
| Book appointment | c843c4c | pass | `tests/appointment-flows.spec.ts` | Doctor search + empty state, Next gating per step, back, real booking with "Doctor Test" (each project uses a different date). Dr. Smoke Doctor has no published availability in DEV |
| Reschedule | c843c4c | pass | `tests/appointment-flows.spec.ts` | Doctor step skipped, reason prefilled, new slot confirmed |
| Cancel appointment | c843c4c | pass | `tests/appointment-flows.spec.ts` | Reason required, keep returns, confirm moves the visit to Cancelled. Each run cancels its own booking |
| Pre-visit intake | c843c4c | fail (MB-010) | `tests/pre-visit.spec.ts` | DEV has no assessment for the smoke patient and no bookable doctor has a template, so the assessment row is mocked (writes stubbed, AI summary real). Every question type, required gating, back, review, complete, close confirm, not-found |
| AI assistant + history | c843c4c | pass | `tests/assistant.spec.ts` | MB-009 fixed-verified. Consent allow/deny, context indicator, real `ai-chat` reply tagged "AI-generated", history sheet, new chat |
| Messages | c843c4c | pass | `tests/messages.spec.ts` | 1 conversation, open thread and back, error state. Search only appears with more than 3 threads (by design, skipped) |
| Conversation | c843c4c | fail (MB-011, MB-015) | `tests/conversation.spec.ts` | Real send, edit (long-press), delete with undo, and delete; English text is LTR in Arabic (MB-009 verified here). An unknown thread id looks like an empty, writable thread (MB-011). Leaving during the undo window cancels the delete (MB-015) |
| My health hub | c843c4c | pass | `tests/health.spec.ts` | MB-006 fixed-verified (back is "Go back"). All 9 rows open the right screen and back returns |
| Medical records + record form | c843c4c | pass (RTL: MB-016) | `tests/records.spec.ts` | Counts, filter, action sheet (3 types), required-field validation for each category, add/edit/remove a condition (soft delete), error state. Search only appears with more than 5 records (by design) |
| Lab results | c843c4c | pass (empty only) | `tests/lab-results.spec.ts` | Segments with `aria-selected`, empty states, back, error + retry. The smoke patient has no lab orders, so lab detail and "Explain with AI" are not reachable |
| Prescriptions | c843c4c | pass | `tests/prescriptions.spec.ts` | Segments, empty states, add and remove a self-reported medicine (save gating, cancel/confirm dialog), back, error + retry. No prescriptions in DEV, so prescription detail and the pharmacy picker are not reachable |
| Imaging | c843c4c | pass (empty only) | `tests/imaging.spec.ts` | Segments, empty state, back, error + retry. No studies in DEV, so imaging detail is not reachable |
| Documents | c843c4c | fail (MB-013) | `tests/documents.spec.ts` | Segments, list, error + retry. Real upload (iPhone run only) works; removing fails on RLS (MB-013, backend) |
| Document upload | c843c4c | pass (MB-012 web-only) | `tests/documents.spec.ts` | Camera row hidden on web, file chooser, save gating, files over 20 MB rejected, title prefilled from the file name. No close control on web (MB-012) |
| Insurance | c843c4c | pass | `tests/insurance.spec.ts` | No-plan state and its Profile action, claims list, status chips, benefits, error + retry. Note: cancelled visits are listed as "Denied" claims and counted in "You paid"; the web app does the same (parity, not filed) |
| Notifications | c843c4c | pass | `tests/notifications.spec.ts` | Log with All/Unread, mark all read (button hidden when nothing is unread, by design), dashboard bell and back, error + retry. Some notification bodies mix Arabic dates into English text; they are generated by the backend trigger in the language of the session that booked |
| Profile | c843c4c | pass | `tests/profile.spec.ts` | All sections render real data; edit then cancel discards; empty name blocks save; save keeps the values; dashboard avatar and back |
| Settings | c843c4c | pass | `tests/settings.spec.ts` | Language switch shows the restart dialog and flips `dir` (then switches back), theme dark/system, email/SMS/pharmacy toggles persist across reload and are restored (iPhone run only), reset-password email (mocked), sign out (cancel/confirm, logout mocked) clears session and cached health data. Intermittent late 401 after sign-out (MB-014) |

### Final spec totals at `c843c4c` (full suite, all three projects)

Each project runs 99 tests (plus one shared sign-in setup).

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| iphone-14 | 93 | 4 (MB-010, MB-011, MB-013, MB-015) | 2 |
| pixel-7 | 92 | 3 (MB-010, MB-011, MB-015) | 4 |
| rtl-ar | 92 | 4 (MB-010, MB-011, MB-015, MB-016) | 3 |
| **Total** | **277** | **11** | **9** |

Every failure maps to an open bug below; there were no other failures. The MB-016 assertion (RTL records test) was added right after the full run and re-run on its own; the `rtl-ar` row includes it.

Skips, all intentional:
- The OTP "digits stay LTR in Arabic" test runs only on `rtl-ar`.
- Messages search needs more than 3 conversations, and the smoke patient has 1.
- The real document upload and the shared-preference toggles run only on `iphone-14`. This keeps parallel projects from racing on the same account, and the upload can't be cleaned up while MB-013 is open.

### Test data left in DEV

- Bookings with "Doctor Test": each run books, reschedules and then cancels its own.
- Conditions, reported medicines and messages: each run removes its own.
- Profile and preferences: restored to their original values.
- Vault documents: removal is blocked by MB-013. The smoke patient now has 2 "QA e2e upload …" documents from these runs, plus the builder's 2 "QA upload check" documents. They can be soft-deleted once the policy is fixed.

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
| MB-010 | P3 | Pre-visit review | open |
| MB-011 | P3 | Conversation (unknown id) | open |
| MB-012 | P3 | Sheet screens (web) | open |
| MB-013 | P2 | Documents (backend RLS) | open |
| MB-014 | P3 | Sign out | open |
| MB-015 | P2 | Conversation (delete) | open |
| MB-016 | P3 | Every pushed screen, Arabic (header back) | open |

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
- Status: **fixed-verified** in `36949f6` (tested at `c843c4c`): the back button is now named "Go back" on every pushed screen instead of "(tabs), back". In Arabic it is still "رجوع, back"; that leftover is MB-016
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
- Status: open (still reproduces at `c843c4c`)
- Steps: answer a single-select question with option label "Mild" (value `mild`) and a multi-select with "Cough" (`cough`); open the review.
- Expected: "Mild", "Cough" (the labels the patient picked, localized).
- Actual: "mild", "cough" (stored values). Yes/no answers display correctly.
- Fix: map select answers back through `question.options` to their labels for display.
- Spec: `tests/pre-visit.spec.ts` (soft assertions tagged MB-010)
- Screenshot: `mobile-e2e/screenshots/mb-010-previsit-review-values.png`

### MB-011 — Unknown conversation id shows an empty, writable thread
- Severity: P3
- Screen: Conversation (`/conversation/<id>`)
- Status: open
- Steps: open `/conversation/00000000-0000-4000-8000-000000000000` (or a stale deep link or push to a conversation the patient can't access).
- Expected: a not-found state, like appointment detail and pre-visit have, with no composer.
- Actual: the screen shows "No messages in this thread yet" with an active composer and the generic "Messages" title. The read-receipt RPC `mark_conversation_messages_read` fails with 400 "Conversation not found." (a console error).
- Fix: when the conversation isn't in `useConversationList` (and the thread query returns nothing), render a not-found `EmptyState`, hide the composer, and skip the mark-read RPC.
- Spec: `tests/conversation.spec.ts` › "unknown conversation id … (MB-011)"
- Screenshot: `mobile-e2e/screenshots/mb-011-unknown-conversation.png`

### MB-012 — Sheet screens have no close control on web
- Severity: P3 (web only; native has swipe-down and the grabber)
- Screen: every `formSheet` route with `headerShown: false`: document upload, record form, cancel appointment, pharmacy picker, assistant history
- Status: open
- Steps: Documents › Upload.
- Expected: a visible Close/Cancel control, or a header with a back button, as the pushed screens have.
- Actual: on web the only way out is the browser's back button. On native, VoiceOver and TalkBack users also benefit from an explicit close button.
- Fix: add a small sheet header with a close `IconButton` (with an accessibility label) on these screens, at least when `Platform.OS === 'web'`.
- Screenshot: `mobile-e2e/screenshots/mb-012-sheet-no-close.png`

### MB-013 — Removing a vault document fails: RLS on `patient_document_files`
- Severity: P2 (backend; same on the web app; already listed as a builder blocker)
- Screen: Documents
- Status: open (backend policy, not fixable in `mobile/`)
- Steps: upload a document, then Remove › confirm.
- Expected: the document is soft-deleted and disappears.
- Actual: 403 with `new row violates row-level security policy for table "patient_document_files"`; the document stays.
- Fix: the UPDATE policy on `patient_document_files` needs a `WITH CHECK` that allows the owner to set `is_deleted = true` / `deleted_at` (the soft-deleted row probably fails a `USING`/`WITH CHECK` that filters `is_deleted = false`).
- Spec: `tests/documents.spec.ts` › "uploads a real PDF to the vault and tries to remove it" (iPhone run)
- Screenshot: `mobile-e2e/screenshots/mb-013-document-remove-rls.png`

### MB-014 — After sign-out, a stale dashboard query fires and gets 401
- Severity: P3 (intermittent; about 1 in 3 sign-outs)
- Screen: Settings › Sign out
- Status: open
- Steps: open the dashboard, then Settings › Sign out › confirm.
- Expected: no data requests after the session is cleared.
- Actual: sometimes a `user_profiles` lookup for the care-team doctors runs after sign-out and returns 401 (a console error). The URL also passes through `/(auth)` before `/sign-in`. Session and cached health data (`ceenaix.cache.v1.*`) are correctly cleared.
- Fix: cancel or ignore in-flight queries when the session becomes null (for example, gate hooks on `user` and abort on sign-out), and redirect straight to `/sign-in`.
- Spec: `tests/settings.spec.ts` › "sign out …". It records an `MB-014` annotation when the 401 occurs instead of failing intermittently.

### MB-015 — Leaving a thread during the 5-second undo window silently cancels a message delete
- Severity: P2 (the patient believes a message is deleted, but the doctor still sees it)
- Screen: Conversation
- Status: open
- Steps: long-press your own message › Delete; within 5 s tap back (or the app is backgrounded/killed); reopen the thread.
- Expected: the delete commits (or the undo bar says it was cancelled).
- Actual: the message is still there. The unmount cleanup in `conversation/[id].tsx` calls `clearTimeout(undoTimer)` without running the pending `thread.remove`.
- Fix: on unmount, flush the pending delete (call `thread.remove(pendingDelete)`) instead of only clearing the timer.
- Spec: `tests/conversation.spec.ts` › "MB-015: …" (cleans up its own message)
- Screenshot: `mobile-e2e/screenshots/mb-015-delete-reappears.png`

### MB-016 — In Arabic, the header back button is announced as "رجوع, back"
- Severity: P3 (accessibility, RTL)
- Screen: every pushed stack screen
- Status: open
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
