BUILD STATUS: COMPLETE

# CeenAiX Patient App — Test Handoff

Builder branch: `mobile-patient-parity`. QA branch: `mobile-patient-parity-tests` (the builder never edits QA files).

All patient and auth screens are built. QA branch 61bd0e5 is merged. Full `mobile-e2e` run on the merged build (iphone-14, pixel-7, rtl-ar): 288 passed, 9 skipped (all intentional), 1 failed. The failure is the real document removal on iphone-14 (MB-013): the fix is a backend migration that is committed but not yet applied to DEV.

## Running the app for tests

```bash
cd mobile
npm ci
npx expo export --platform web      # static SPA in mobile/dist (single-page output, needs index.html fallback)
npx expo start --web --port 8081    # dev server alternative
```

- Environment: `mobile/.env` (gitignored) holds `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the DEV project `lgfaucsfiyxvmsghnpey`. Copy `mobile/.env.example` and fill in the values from `env.template.dev` at the repo root.
- Test patient: `smoke.patient@ceenaix.test` / `CeenAiXSmoke!2026`. Doctor: Dr. Smoke Doctor. Virtual appointment: `22222222-3333-4333-8444-000000000901`. It is in the past, so it shows under **Completed** and its join window has ended.
- After the "Dev mobile QA seed" job on main, the smoke patient has a lab order `22222222-3333-4333-8444-000000000921` (HbA1c + MRI Brain), an active prescription `22222222-3333-4333-8444-000000000911` with no pharmacy assigned (so Send to pharmacy opens the picker), and a released imaging study with accession `IMG-22222222`. Pharmacy "QA Al Noor Pharmacy" is in `list_active_pharmacies`. A pre-visit assessment `22222222-3333-4333-8444-000000000932` is created only when appointment `…0901` has none.
- Removing a vault document needs migration `20260719090000_patient_document_soft_delete_rls.sql` (MB-013) on DEV. The Dev Supabase job applies it on merge to main. The seed then soft-deletes leftover documents whose title or file name starts with `QA `.
- Language follows the browser locale on first launch (`ar-*` gives Arabic with `dir="rtl"` on `<html>`). After that, the choice is stored under `localStorage['ceenaix.lang']`. Switching language in Settings reloads the page on web.
- The session is stored by supabase-js in `localStorage`, so Playwright `storageState` works.

## testID conventions

React Native `testID` renders as `data-testid` on web, so use `page.getByTestId(...)`.

| Pattern | Used for | Examples |
|---|---|---|
| `screen-<name>` | Root of every route | `screen-sign-in`, `screen-dashboard`, `screen-appointment-detail` |
| `tab-<name>` | Bottom tabs (web and native) | `tab-home`, `tab-appointments`, `tab-assistant`, `tab-messages`, `tab-health` |
| `btn-<action>` | Buttons and icon buttons | `btn-sign-in`, `btn-book-appointment`, `btn-send-message`, `btn-retry` |
| `input-<field>` | Text, date and number inputs | `input-login-email`, `input-login-password`, `input-doctor-search` |
| `toggle-<setting>` | Switches | `toggle-push`, `toggle-ai-consent`, `toggle-signup-terms` |
| `segment-<group>` / `segment-<group>-<value>` | Segmented controls and their options | `segment-appointments-status-past`, `segment-language-ar` |
| `chip-<group>-<value>` | Choice chips | `chip-blood-type-O+`, `chip-specialty-all` |
| `option-<…>` | Radio/checkbox rows | `option-cancel-reason-<reason>`, `option-0`, `option-yes` (pre-visit) |
| `section-<name>` (`-action` for the header link) | Titled sections | `section-medications`, `section-medications-action` |
| `<entity>-card-<id>` / `<entity>-row-<id>` | List items, using database ids | `appointment-card-<id>`, `conversation-card-<id>`, `doctor-card-<userId>`, `lab-order-card-<id>`, `prescription-card-<id>`, `imaging-card-<id>`, `notification-card-<id>`, `document-card-<id>` |
| `slot-<iso>` / `date-<yyyy-mm-dd>` | Booking slots and days | `date-2026-10-21`, `slot-2026-10-21T05:00:00.000Z` |
| `state-empty[-<context>]` | Empty states (the action button is `<id>-action`) | `state-empty-appointments`, `state-empty-next-appointment-action` |
| `state-error` | Error card. Its retry button is `btn-retry` | |
| `state-loading` | Skeleton list | |
| `state-route-error` | Route / root error boundary | |
| `message-<tone>` | Inline messages (`danger`, `success`, `info`, `warning`) | `message-danger` for form errors |
| `banner-offline` | Stale-cache banner | |
| `dialog`, `action-sheet`, `dialog-title`, `dialog-message`, `dialog-btn-<index>`, `dialog-btn-cancel` | Web replacement for native alerts and action sheets. `<index>` counts only the non-cancel buttons, from 0 | Sign-out confirm: `dialog-btn-0` |
| `chat-message-user` / `chat-message-assistant` / `chat-message-own` / `chat-message-other` | Chat bubbles (assistant and conversation) | |

Interactive controls also carry an `accessibilityLabel`, rendered as `aria-label`, so `getByRole('button', { name })` works too.

Stack screens are kept mounted underneath the screen on top, so a hidden `screen-dashboard` can still be in the DOM while `screen-appointment-detail` is showing. Assert with `toBeVisible()` or `locator(...).filter({ visible: true })`, not `count()`.

## Screens

| Screen | Status | Commit SHA | How to reach it | Notes |
|---|---|---|---|---|
| Sign in | fixed-ready-for-retest | c46a74a | `/sign-in` (any route while signed out redirects here) | Email/password and phone OTP (`segment-login-mode-otp`) |
| Sign up | ready-for-test | edfc1f5 | `/sign-up` or `link-sign-up` | 3 steps: `option-signup-email` / `option-signup-phone`, then details, then password and terms |
| Phone OTP | ready-for-test | edfc1f5 | Sign in, then OTP mode, then `btn-send-code` | Needs a real SMS; the cells are `input-otp-cells`, the hidden input is `input-otp-code` |
| Forgot password | ready-for-test | edfc1f5 | `/forgot-password` or `link-forgot-password` | |
| Reset password | ready-for-test | edfc1f5 | `/reset-password` (recovery deep link) | Without a recovery session it shows "request a new link" (`btn-request-new-link`) |
| Onboarding | ready-for-test | edfc1f5 | Shown automatically when `profile_completed = false` | Not reachable with the smoke patient (already completed) |
| Patient only | ready-for-test | edfc1f5 | Sign in as a non-patient role | `state-profile-error` + `btn-retry` if the profile lookup fails |
| Dashboard | fixed-ready-for-retest | c6cae45 | `/` or `tab-home` | Quick actions `btn-book-appointment`, `btn-quick-messages`, `btn-quick-labs`, `btn-quick-assistant`. Cold start on web paints a boot screen (`state-loading`) instead of a blank page (MB-008) |
| Appointments | fixed-ready-for-retest | faa44e9 | `/appointments` or `tab-appointments` | `segment-appointments-status-{upcoming,past,cancelled}`, `segment-appointments-type-{all,in_person,virtual}`. Selected segment now carries `aria-selected` (MB-007) |
| Appointment detail | ready-for-test | edfc1f5 | `/appointment/<id>` or `appointment-card-<id>` | Deep links have a back button (anchored on the tabs) |
| Cancel appointment | fixed-ready-for-retest | e8ada94 | `btn-cancel-appointment` on an upcoming appointment, or `/cancel/<id>` | Sheet on native, full page on web. Reason radios carry `aria-checked` (MB-007). Close button `btn-close-sheet` (MB-012) |
| Book / reschedule | fixed-ready-for-retest | faa44e9 | `/book`, `btn-book-appointment`; reschedule via `btn-reschedule` | Steps: doctor, then time (`date-*`, `slot-*`), then details, then review (`btn-booking-next`). Selected doctor, date and slot carry `aria-selected` (MB-007) |
| Pre-visit intake | fixed-ready-for-retest | 6e38c05 | `/pre-visit/<assessmentId>` (from appointment detail `btn-pre-visit` or after booking) | Route takes the **assessment** id, not the appointment id. Options carry `aria-checked` (MB-007). Review shows option labels, not stored values (MB-010) |
| Video visit | ready-for-test | edfc1f5 | `/visit/<appointmentId>` or `btn-join-call` | Web shows `state-video-unavailable` ("Video visits require the mobile app"); LiveKit runs in native dev builds only |
| AI assistant | fixed-ready-for-retest | 417d1cb | `/assistant` or `tab-assistant` | `input-assistant-message`, `btn-send-message`, `btn-ai-context`, `btn-ai-consent-allow`, `prompt-chip-<n>`. Replies are tagged as AI-generated. Message text direction follows its content, so English punctuation stays at the end in Arabic (MB-009) |
| Assistant history | fixed-ready-for-retest | e8ada94 | `btn-assistant-history` or `/assistant-history` | `history-session-<id>`, `btn-history-new-chat`. Close button `btn-close-sheet` (MB-012) |
| Messages | ready-for-test | edfc1f5 | `/messages` or `tab-messages` | Search box (`input-messages-search`) appears when there are more than 3 conversations |
| Conversation | fixed-ready-for-retest | 3be2857 | `conversation-card-<id>` or `/conversation/<id>` | `input-message`, `btn-send-message`; long-press for edit/delete (native). Same content-direction fix as the assistant (MB-009). Unknown id shows `state-empty-conversation` with no composer and skips mark-read (MB-011). Leaving during the undo window commits the delete (MB-015, 171ab18) |
| My health hub | ready-for-test | edfc1f5 | `/health` or `tab-health` | Rows `row-records`, `row-lab-results`, `row-prescriptions`, `row-imaging`, `row-documents`, `row-insurance`, `row-notifications`, `row-profile`, `row-settings` |
| Medical records | fixed-ready-for-retest | e0d2772 | `/records` or `row-records` | `btn-add-record` opens an action sheet (`action-sheet` on web). Header back button is named "Back" / "رجوع" instead of "(tabs)" (MB-006); applies to every pushed screen. In Arabic the back button is named just "رجوع" (MB-016) |
| Record form | fixed-ready-for-retest | e8ada94 | `/record-form?category=condition\|allergy\|vaccination[&id=<id>]` | `btn-save-record`, `btn-remove-record`. Title and close button `btn-close-sheet` (MB-012) |
| Lab results | ready-for-test | edfc1f5 | `/lab-results` or `row-lab-results` | `segment-labs-*` |
| Lab result detail | ready-for-test | edfc1f5 | `lab-order-card-<id>` | `btn-explain-with-ai` opens the assistant with a prompt |
| Prescriptions | ready-for-test | edfc1f5 | `/prescriptions` or `row-prescriptions` | Includes self-reported medicines (`card-add-reported-med`) |
| Prescription detail | ready-for-test | edfc1f5 | `prescription-card-<id>` | `btn-send-to-pharmacy` opens the pharmacy picker |
| Pharmacy picker | fixed-ready-for-retest | e8ada94 | `/pharmacy-picker/<prescriptionId>` | `pharmacy-card-<id>`. Close button `btn-close-sheet` (MB-012) |
| Imaging | ready-for-test | edfc1f5 | `/imaging` or `row-imaging` | |
| Imaging detail | ready-for-test | edfc1f5 | `imaging-card-<id>` | |
| Documents | fixed-ready-for-retest | ab64ac9 | `/documents` or `row-documents` | `segment-documents-*`, `btn-upload-document`. Remove needs the MB-013 migration deployed to DEV |
| Document upload | fixed-ready-for-retest | e8ada94 | `/document-upload` or `btn-upload-document` | On web the camera row is hidden; use `btn-pick-library` / `btn-pick-files` (file chooser). Close button `btn-close-sheet` (MB-012) |
| Insurance | ready-for-test | edfc1f5 | `/insurance` or `row-insurance` | |
| Notifications | ready-for-test | edfc1f5 | `/notifications`, `btn-open-notifications` | `btn-mark-all-read`, `notification-card-<id>` |
| Profile | ready-for-test | edfc1f5 | `/profile`, `btn-open-profile` (dashboard avatar) | Edit via `section-personal-action` / `section-insurance-action` |
| Settings | fixed-ready-for-retest | f5dfeaf | `/settings` or `row-settings` | `segment-language-{en,ar}`, `segment-theme-{system,light,dark}`, `btn-sign-out` (confirms through `dialog`). Sign-out aborts in-flight data requests and blocks new ones until the next sign-in (MB-014) |

## Bug fixes

| Bug | Status | Fix |
|---|---|---|
| MB-001 web export missing `react-dom` / `react-native-web` | fixed-ready-for-retest | fixed MB-001 in f5bf5b0 (dependencies + `@expo/metro-runtime` committed with lockfile) |
| MB-002 `useLastNotificationResponse` crashes on web | fixed-ready-for-retest | fixed MB-002 in f5bf5b0 (hook replaced by a no-op on web; push registration skipped on web) |
| MB-003 root error boundary needs `ThemeProvider` | fixed-ready-for-retest | fixed MB-003 in edfc1f5 (`useTheme` falls back to the system palette outside the provider; the boundary strings have defaults) |
| MB-004 invalid `direction` style on OTP cells | fixed-ready-for-retest | fixed MB-004 in f5bf5b0 (native keeps `direction: 'ltr'`; web uses `row`/`row-reverse` from the document direction) |
| MB-005 patient-only screen flashes (or sticks) while the profile loads | fixed-ready-for-retest | fixed MB-005 in 0218ca2 + c46a74a (session and role are published together; the profile query retries and a failure shows `state-profile-error` with Retry instead of "not a patient"; `ensureProfile` runs only when the select succeeds with no row; the sign-in button stays busy until the navigator moves on). Local run of `tests/auth.spec.ts` at c46a74a: 38 passed, 2 skipped |
| MB-006 header back control is announced as "(tabs)" | fixed-ready-for-retest | fixed MB-006 in 36949f6 (`headerBackTitle` is the localized "Back" for every screen in the app stack; it is hidden visually by the minimal back style but names the control) |
| MB-007 segmented control does not expose the selected segment | fixed-ready-for-retest | fixed MB-007 in faa44e9 (react-native-web 0.21 ignores `accessibilityState`; all selection/checked/expanded/disabled state now uses `aria-*` props, which also work on native) |
| MB-008 blank page on cold start while the session loads | fixed-ready-for-retest | fixed MB-008 in c6cae45 (web renders a boot screen with the splash logo and a skeleton bar, `state-loading` / role `progressbar`, while i18n and auth load; native keeps the OS splash) |
| MB-009 English text in Arabic mode puts punctuation on the wrong side | fixed-ready-for-retest | fixed MB-009 in 417d1cb (chat bubbles, AI replies and Markdown blocks take their writing direction from the first strong character of the content) |
| MB-010 pre-visit review shows raw option values | fixed-ready-for-retest | fixed MB-010 in 6e38c05 (single/multi-select answers are mapped back through the question options to their labels; yes/no are localized) |
| MB-011 unknown conversation id shows an empty, writable thread | fixed-ready-for-retest | fixed MB-011 in 3be2857 (the thread query also looks up the conversation under RLS; when it doesn't exist the screen shows `state-empty-conversation` with a Messages action, no composer, and the mark-read RPC is skipped) |
| MB-012 sheet screens have no close control on web | fixed-ready-for-retest | fixed MB-012 in e8ada94 (shared `SheetTitle` with a close button, `btn-close-sheet`, labelled "Close", on document upload, record form, cancel, pharmacy picker and assistant history; all platforms) |
| MB-013 removing a vault document fails on RLS | fixed-ready-for-retest (needs DEV deploy) | fixed MB-013 in ab64ac9 (migration `20260719090000_patient_document_soft_delete_rls.sql` splits the `FOR ALL` policy: owners SELECT their own rows, UPDATE only live rows and must set `deleted_at` when soft-deleting, no DELETE policy; regression test `supabase/tests/patient_document_soft_delete_rls.sql`). Not applied to DEV from here (no Supabase CLI login); it ships with the CI "Dev Supabase" job on merge to main, or `node scripts/push-migrations-management-api.mjs --project-ref lgfaucsfiyxvmsghnpey` with an access token |
| MB-014 stale query gets 401 after sign-out | fixed-ready-for-retest | fixed MB-014 in f5dfeaf (the Supabase client's fetch aborts in-flight REST/Functions/Storage requests and refuses new ones once the session ends, until the next sign-in; `useQuery` ignores those aborts) |
| MB-015 leaving a thread during the undo window cancels the delete | fixed-ready-for-retest | fixed MB-015 in 171ab18 (unmount and app backgrounding commit the pending delete instead of clearing the timer) |
| MB-016 Arabic back button is announced as "رجوع, back" | fixed-ready-for-retest | fixed MB-016 in e0d2772 (on web the app stack renders the header back button with `accessibilityLabel` set to the localized "Back" only; native keeps the platform back control) |

## Native-only (not covered on web)

LiveKit video, camera capture, biometric lock, push notifications, haptics, native share sheet, form-sheet detents and swipe-back. On web these are guarded: the video screen shows a "requires the mobile app" state, the camera is hidden, the lock is skipped, and native alerts become the `dialog` host.
