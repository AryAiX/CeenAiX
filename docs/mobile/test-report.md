# CeenAiX Patient Mobile App — QA Test Report

QA branch: `mobile-patient-parity-tests` (tracks builder branch `mobile-patient-parity`).
Harness: Playwright against the Expo web export (`mobile/dist`), in `mobile-e2e/` (see `mobile-e2e/README.md`).
Projects: `iphone-14` (WebKit, 390x844), `pixel-7` (Chromium, 412x915), `rtl-ar` (Chromium, 412x915, locale `ar-AE`).

Last updated: 2026-10-19. Latest builder commit tested: `dc8a230`. Spec totals below cover the auth and tab batch; appointment flows add 14 tests and pre-visit adds 3 per project (all pass except MB-010).

Every test also fails on unexpected console errors or page errors, and every screen spec checks document direction (LTR, or RTL in `rtl-ar`), no horizontal overflow at phone width, and accessible names on interactive controls. Screenshots are in `mobile-e2e/screenshots/{iphone-14,rtl-ar}/`.

Environment note: the DEV Supabase project is sometimes slow (2.5–3 s even for `/auth/v1/health`, with individual queries taking 5–10 s at peak). Tests use generous timeouts; this is not treated as an app defect.

## Per-screen results

| Screen | Commit tested | Result | Specs | Notes |
|---|---|---|---|---|
| App boot (web) | dc8a230 | pass | all | MB-001, MB-002 and MB-003 fixed-verified. Cold start is blank (MB-008) |
| Sign in (email + phone OTP mode) | dc8a230 | pass | `tests/auth.spec.ts` | MB-005 fixed-verified. Wrong password, validation, password toggle, links, signed-out redirect |
| Forgot password | dc8a230 | pass | `tests/auth.spec.ts` | Reset endpoint mocked (no real email) |
| Phone OTP | dc8a230 | pass | `tests/auth.spec.ts` | SMS endpoints mocked. Wrong code, resend cooldown, digits stay LTR in Arabic |
| Sign up (email + phone) | dc8a230 | pass | `tests/auth.spec.ts` | Sign-up endpoint mocked (no account created). Every validation step, back, check-email state |
| Dashboard | dc8a230 | pass | `tests/dashboard.spec.ts` | Real data (greeting, care team: Dr. Smoke Doctor), quick actions, tabs, skeleton, offline banner from cache, error + retry |
| Appointments (Visits) | dc8a230 | fail (MB-007) | `tests/appointments.spec.ts` | Status/type segments, past virtual visit 901, detail push and back, book, skeleton, error + retry |
| AI assistant | dc8a230 | pass | `tests/assistant.spec.ts` | Consent allow/deny, context indicator, real `ai-chat` reply tagged "AI-generated", history sheet, new chat. RTL bidi issue (MB-009) |
| Messages | dc8a230 | pass | `tests/messages.spec.ts` | 1 conversation (builder QA thread), open thread and back, error state. Search only appears with more than 3 threads (by design, skipped) |
| My health hub | dc8a230 | fail (MB-006) | `tests/health.spec.ts` | All 9 rows open the right screen and back returns |
| Appointment detail | dc8a230 | pass | `tests/appointment-flows.spec.ts` | Past visit 901 (no cancel/reschedule, follow-up message), upcoming booked visit (reschedule/cancel/pre-visit section), deep-link back, not-found, error + retry |
| Video visit lobby | dc8a230 | pass (web fallback) | `tests/appointment-flows.spec.ts` | Web shows the "requires the mobile app" state; close works. LiveKit call is native-only, not covered |
| Book appointment | dc8a230 | pass | `tests/appointment-flows.spec.ts` | Doctor search + empty state, Next gating per step, back, real booking with "Doctor Test" (each project uses a different date). Dr. Smoke Doctor has no published availability in DEV |
| Reschedule | dc8a230 | pass | `tests/appointment-flows.spec.ts` | Doctor step skipped, reason prefilled, new slot confirmed |
| Cancel appointment | dc8a230 | pass | `tests/appointment-flows.spec.ts` | Reason required, keep returns, confirm moves the visit to Cancelled. Each run cancels its own booking |
| Pre-visit intake | dc8a230 | fail (MB-010) | `tests/pre-visit.spec.ts` | DEV has no assessment for the smoke patient and no bookable doctor has a template, so the assessment row is mocked (writes stubbed, AI summary real). Every question type, required gating, back, review, complete, close confirm, not-found |
| Conversation, records, record form, labs, prescriptions, pharmacy picker, imaging, documents, upload, insurance, notifications, profile, settings, reset password | — | in progress | — | Next batch |

### Spec totals at `dc8a230` (auth + tab screens)

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| iphone-14 | 34 | 3 (MB-006, MB-007, MB-008) | 2 |
| pixel-7 | 34 | 3 (MB-006, MB-007, MB-008) | 2 |
| rtl-ar | 35 | 3 (MB-006, MB-007, MB-008) | 1 |

Skips: an RTL-only test (OTP digit order) skips on the LTR projects, and Messages search skips because the patient has 3 or fewer threads.

## Bugs

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
- Status: open
- Steps: Health tab → Records; inspect the header back control (or use VoiceOver/TalkBack).
- Expected: an accessible name such as "Back" or "Back to My Health".
- Actual: the accessible name is `(tabs), back`; the native-stack back button uses the previous route's name, which is the `(tabs)` group. On native the back title has the same source.
- Fix: set `headerBackTitle` (or `title`) on the `(tabs)` screen in `src/app/(app)/_layout.tsx`, or set `headerBackAccessibilityLabel` / `headerBackButtonMenuEnabled` per screen.
- Spec: `tests/health.spec.ts` › "MB-006: …"
- Screenshot: `mobile-e2e/screenshots/mb-006-back-label.png`

### MB-007 — Segmented controls do not expose the selected segment on web
- Severity: P3 (accessibility, web)
- Screen: all `SegmentedControl` users (visits, records, labs, prescriptions, imaging, documents, insurance, notifications, settings, sign-in mode)
- Status: open
- Steps: Visits tab; inspect `segment-appointments-status-upcoming`.
- Expected: `aria-selected="true"` on the selected `role="tab"` (as the bottom tabs already do).
- Actual: no `aria-selected` on any segment. react-native-web 0.21 does not map `accessibilityState.selected`.
- Fix: pass `aria-selected={selected}` (or `accessibilityState` plus `aria-selected`) in `SegmentedControl` (`src/components/ui/form.tsx`).
- Spec: `tests/appointments.spec.ts` › "MB-007: …"
- Screenshot: `mobile-e2e/screenshots/mb-007-segment-selected.png`

### MB-008 — Cold start on web is a blank white page while the session and profile load
- Severity: P3 (web only; native shows the splash screen)
- Screen: root layout (`RootNavigator` returns `null` while `isLoading`)
- Status: open
- Steps: open any route with a stored session on a slow network (the spec delays Supabase REST by 6 s).
- Expected: a branded loading state or skeleton.
- Actual: nothing is painted for the whole auth + profile load (about 10 s on DEV at peak).
- Fix: render a lightweight splash (logo + spinner/skeleton) instead of `null` on web.
- Spec: `tests/dashboard.spec.ts` › "MB-008: …"
- Screenshot: `mobile-e2e/screenshots/mb-008-cold-start-blank.png`

### MB-009 — In Arabic, English chat text has its punctuation on the wrong side
- Severity: P3 (RTL)
- Screen: AI assistant (user and assistant bubbles); likely conversation bubbles too
- Status: open
- Steps: language Arabic; ask the assistant an English question.
- Expected: Latin-script content keeps its own direction ("…per minute.").
- Actual: the bubble text inherits RTL, so the trailing "." / "?" renders at the start (".ranges from 60 to 100 beats per minute", "?resting heart rate").
- Fix: render message text with `writingDirection: 'auto'` (on web, `dir="auto"`) instead of forcing the app direction.
- Screenshot: `mobile-e2e/screenshots/mb-009-rtl-bidi-punctuation.png`

### MB-010 — Pre-visit review shows raw option values instead of labels
- Severity: P3
- Screen: Pre-visit intake › review step (`mobile/src/app/(app)/pre-visit/[id].tsx`, review card renders `answer.answerText`)
- Status: open
- Steps: answer a single-select question with option label "Mild" (value `mild`) and a multi-select with "Cough" (`cough`); open the review.
- Expected: "Mild", "Cough" (the labels the patient picked, localized).
- Actual: "mild", "cough" (stored values). Yes/no answers display correctly.
- Fix: map select answers back through `question.options` to their labels for display.
- Spec: `tests/pre-visit.spec.ts` (soft assertions tagged MB-010)
- Screenshot: `mobile-e2e/screenshots/mb-010-previsit-review-values.png`

## Not testable in Playwright (native-only)

Tracked as "native-only, not covered", not failures: LiveKit native video, camera / image-picker capture, biometric app lock (`expo-local-authentication`), push notifications, haptics, native share sheet, native sheets/detents and swipe-back gestures.
