# CeenAiX Patient App — Test Handoff

Builder branch: `mobile-patient-parity`. QA branch: `mobile-patient-parity-tests` (the builder never edits QA files).

## Running the app for tests

```bash
cd mobile
npm ci
npx expo export --platform web      # static SPA in mobile/dist (single-page output, needs index.html fallback)
npx expo start --web --port 8081    # dev server alternative
```

- Environment: `mobile/.env` (gitignored) holds `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the DEV project `lgfaucsfiyxvmsghnpey`. Copy `mobile/.env.example` and fill in the values from `env.template.dev` at the repo root.
- Test patient: `smoke.patient@ceenaix.test` / `CeenAiXSmoke!2026`. Doctor: Dr. Smoke Doctor. Virtual appointment: `22222222-3333-4333-8444-000000000901`. It is in the past, so it shows under **Completed** and its join window has ended.
- The smoke patient has no conversations, lab orders, prescriptions or imaging studies. Those list screens show their empty states (`state-empty-*`). Detail routes need ids that exist for this patient.
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
| Sign in | ready-for-test | edfc1f5 | `/sign-in` (any route while signed out redirects here) | Email/password and phone OTP (`segment-login-mode-otp`) |
| Sign up | ready-for-test | edfc1f5 | `/sign-up` or `link-sign-up` | 3 steps: `option-signup-email` / `option-signup-phone`, then details, then password and terms |
| Phone OTP | ready-for-test | edfc1f5 | Sign in, then OTP mode, then `btn-send-code` | Needs a real SMS; the cells are `input-otp-cells`, the hidden input is `input-otp-code` |
| Forgot password | ready-for-test | edfc1f5 | `/forgot-password` or `link-forgot-password` | |
| Reset password | ready-for-test | edfc1f5 | `/reset-password` (recovery deep link) | Without a recovery session it shows "request a new link" (`btn-request-new-link`) |
| Onboarding | ready-for-test | edfc1f5 | Shown automatically when `profile_completed = false` | Not reachable with the smoke patient (already completed) |
| Patient only | ready-for-test | edfc1f5 | Sign in as a non-patient role | `state-profile-error` + `btn-retry` if the profile lookup fails |
| Dashboard | ready-for-test | edfc1f5 | `/` or `tab-home` | Quick actions `btn-book-appointment`, `btn-quick-messages`, `btn-quick-labs`, `btn-quick-assistant` |
| Appointments | ready-for-test | edfc1f5 | `/appointments` or `tab-appointments` | `segment-appointments-status-{upcoming,past,cancelled}`, `segment-appointments-type-{all,in_person,virtual}` |
| Appointment detail | ready-for-test | edfc1f5 | `/appointment/<id>` or `appointment-card-<id>` | Deep links have a back button (anchored on the tabs) |
| Cancel appointment | ready-for-test | edfc1f5 | `btn-cancel-appointment` on an upcoming appointment, or `/cancel/<id>` | Sheet on native, full page on web |
| Book / reschedule | ready-for-test | edfc1f5 | `/book`, `btn-book-appointment`; reschedule via `btn-reschedule` | Steps: doctor, then time (`date-*`, `slot-*`), then details, then review (`btn-booking-next`) |
| Pre-visit intake | ready-for-test | edfc1f5 | `/pre-visit/<assessmentId>` (from appointment detail `btn-pre-visit` or after booking) | Route takes the **assessment** id, not the appointment id |
| Video visit | ready-for-test | edfc1f5 | `/visit/<appointmentId>` or `btn-join-call` | Web shows `state-video-unavailable` ("Video visits require the mobile app"); LiveKit runs in native dev builds only |
| AI assistant | ready-for-test | edfc1f5 | `/assistant` or `tab-assistant` | `input-assistant-message`, `btn-send-message`, `btn-ai-context`, `btn-ai-consent-allow`, `prompt-chip-<n>`. Replies are tagged as AI-generated |
| Assistant history | ready-for-test | edfc1f5 | `btn-assistant-history` or `/assistant-history` | `history-session-<id>`, `btn-history-new-chat` |
| Messages | ready-for-test | edfc1f5 | `/messages` or `tab-messages` | Search box (`input-messages-search`) appears when there are more than 3 conversations |
| Conversation | ready-for-test | edfc1f5 | `conversation-card-<id>` or `/conversation/<id>` | `input-message`, `btn-send-message`; long-press for edit/delete (native) |
| My health hub | ready-for-test | edfc1f5 | `/health` or `tab-health` | Rows `row-records`, `row-lab-results`, `row-prescriptions`, `row-imaging`, `row-documents`, `row-insurance`, `row-notifications`, `row-profile`, `row-settings` |
| Medical records | ready-for-test | edfc1f5 | `/records` or `row-records` | `btn-add-record` opens an action sheet (`action-sheet` on web) |
| Record form | ready-for-test | edfc1f5 | `/record-form?category=condition\|allergy\|vaccination[&id=<id>]` | `btn-save-record`, `btn-remove-record` |
| Lab results | ready-for-test | edfc1f5 | `/lab-results` or `row-lab-results` | `segment-labs-*` |
| Lab result detail | ready-for-test | edfc1f5 | `lab-order-card-<id>` | `btn-explain-with-ai` opens the assistant with a prompt |
| Prescriptions | ready-for-test | edfc1f5 | `/prescriptions` or `row-prescriptions` | Includes self-reported medicines (`card-add-reported-med`) |
| Prescription detail | ready-for-test | edfc1f5 | `prescription-card-<id>` | `btn-send-to-pharmacy` opens the pharmacy picker |
| Pharmacy picker | ready-for-test | edfc1f5 | `/pharmacy-picker/<prescriptionId>` | `pharmacy-card-<id>` |
| Imaging | ready-for-test | edfc1f5 | `/imaging` or `row-imaging` | |
| Imaging detail | ready-for-test | edfc1f5 | `imaging-card-<id>` | |
| Documents | ready-for-test | edfc1f5 | `/documents` or `row-documents` | `segment-documents-*`, `btn-upload-document` |
| Document upload | ready-for-test | edfc1f5 | `/document-upload` or `btn-upload-document` | On web the camera row is hidden; use `btn-pick-library` / `btn-pick-files` (file chooser) |
| Insurance | ready-for-test | edfc1f5 | `/insurance` or `row-insurance` | |
| Notifications | ready-for-test | edfc1f5 | `/notifications`, `btn-open-notifications` | `btn-mark-all-read`, `notification-card-<id>` |
| Profile | ready-for-test | edfc1f5 | `/profile`, `btn-open-profile` (dashboard avatar) | Edit via `section-personal-action` / `section-insurance-action` |
| Settings | ready-for-test | edfc1f5 | `/settings` or `row-settings` | `segment-language-{en,ar}`, `segment-theme-{system,light,dark}`, `btn-sign-out` (confirms through `dialog`) |

## Bug fixes

| Bug | Status | Fix |
|---|---|---|
| MB-001 web export missing `react-dom` / `react-native-web` | fixed-ready-for-retest | fixed MB-001 in f5bf5b0 (dependencies + `@expo/metro-runtime` committed with lockfile) |
| MB-002 `useLastNotificationResponse` crashes on web | fixed-ready-for-retest | fixed MB-002 in f5bf5b0 (hook replaced by a no-op on web; push registration skipped on web) |
| MB-003 root error boundary needs `ThemeProvider` | fixed-ready-for-retest | fixed MB-003 in edfc1f5 (`useTheme` falls back to the system palette outside the provider; the boundary strings have defaults) |
| MB-004 invalid `direction` style on OTP cells | fixed-ready-for-retest | fixed MB-004 in f5bf5b0 (native keeps `direction: 'ltr'`; web uses `row`/`row-reverse` from the document direction) |

## Native-only (not covered on web)

LiveKit video, camera capture, biometric lock, push notifications, haptics, native share sheet, form-sheet detents and swipe-back. On web these are guarded: the video screen shows a "requires the mobile app" state, the camera is hidden, the lock is skipped, and native alerts become the `dialog` host.
