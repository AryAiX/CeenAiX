# CeenAiX Patient Mobile App — QA Test Report

QA branch: `mobile-patient-parity-tests` (tracks builder branch `mobile-patient-parity`).
Harness: Playwright against the Expo web export (`mobile/dist`), in `mobile-e2e/` (see `mobile-e2e/README.md`).
Projects: `iphone-14` (WebKit, 390x844), `pixel-7` (Chromium, 412x915), `rtl-ar` (Chromium, 412x915, locale `ar-AE`).

Last updated: 2026-10-19. Latest builder commit tested: `ed7bec0`. The handoff file `docs/mobile/test-handoff.md` is not present yet, so screens are tested as soon as they have `testID`s.

Environment note: the DEV Supabase project responds slowly (about 2.5–3 s even for `/auth/v1/health`; the password grant takes 3–11 s). Sign-in to dashboard takes 10–15 s in tests because of this. It is not treated as an app defect.

## Per-screen results

| Screen | Commit tested | Result | Specs | Notes |
|---|---|---|---|---|
| App boot (web) | ed7bec0 | pass | all | MB-001, MB-002 fixed-verified |
| Sign in (email + phone OTP mode) | ed7bec0 | fail (MB-005) | `tests/auth.spec.ts` | Validation, wrong password, password toggle, links, signed-out redirect, RTL all pass |
| Forgot password | ed7bec0 | pass | `tests/auth.spec.ts` | Reset endpoint mocked (no real email) |
| Phone OTP | ed7bec0 | pass | `tests/auth.spec.ts` | SMS endpoints mocked; wrong code, cooldown, digits stay LTR in Arabic |
| Sign up (email + phone) | ed7bec0 | pass | `tests/auth.spec.ts` | Sign-up endpoint mocked (no account created); every validation step checked |

### Auth spec totals at `ed7bec0`

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| iphone-14 | 12 | 1 (MB-005) | 1 (RTL-only test) |
| pixel-7 | 12 | 1 (MB-005) | 1 (RTL-only test) |
| rtl-ar | 13 | 1 (MB-005) | 0 |

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
- Status: **fixed-verified** in `f5bf5b0` (hook is skipped on web; app boots to sign-in)
- Steps: build web, open `/` at 390x844.
- Expected: sign-in screen.
- Actual (at `075d20c`): blank screen; swallowed error was `ExpoNotifications.getLastNotificationResponse is not available on web`.
- Screenshot: `mobile-e2e/screenshots/mb-002-root-crash.png`

### MB-003 — Root `ErrorBoundary` needs `ThemeProvider`, so any root error becomes an opaque crash
- Severity: P1
- Screen: root layout / `RouteErrorBoundary` (`mobile/src/components/ui/layout.tsx`)
- Status: open (still present at `ed7bec0`)
- Steps: any error thrown inside `RootLayout` (MB-002 was one example).
- Expected: the error state with Retry.
- Actual: `src/app/_layout.tsx` re-exports `RouteErrorBoundary`, which calls `useTheme()`. At the root, the boundary renders outside `ThemeProvider`, so it throws `useTheme must be used within ThemeProvider` and the original error is lost (blank screen on web and native).
- Fix: give the root layout its own boundary that does not depend on providers (static colors), or make `useTheme` fall back to the light palette when there is no provider.

### MB-004 — Invalid style `direction` on the OTP cells (web console error)
- Severity: P3
- Screen: Phone OTP (`mobile/src/app/(auth)/otp.tsx`)
- Status: **fixed-verified** in `f5bf5b0` (web uses `flexDirection` only; no console error; digits stay LTR in Arabic)

### MB-005 — After sign-in, a patient sees "This app is for patients" until the profile loads (and stays there if the profile query fails)
- Severity: P1
- Screen: sign-in → root navigator (`mobile/src/providers/auth-provider.tsx` `sync` / `loadProfiles`, `mobile/src/app/_layout.tsx` guards)
- Status: open
- Steps: sign out; sign in as `smoke.patient@ceenaix.test`.
- Expected: a loading state, then the dashboard.
- Actual: as soon as the token returns, `sync()` sets `session` while `role` is still `null`, so the `patient-only` guard (`signedIn && !isPatient`) matches. The patient sees the "Patient Portal — This app is for patients… Open on web / Sign out" screen for about 5–8 s on DEV, then the dashboard. In one run the dashboard never appeared: `loadProfiles` ignores the `error` from the `user_profiles` select, falls into `ensureProfile` (an INSERT for an existing user) and returns `null`, leaving a real patient stuck on the wrong screen with no retry.
- Fix: keep `isLoading` true (or add a `profileLoading` flag) until profiles resolve on sign-in. Treat a failed profile query as an error state with Retry, not as "not a patient", and only call `ensureProfile` when the select succeeds with no row.
- Spec: `tests/auth.spec.ts` › "MB-005: a patient never sees the patient-only screen while the profile loads"
- Screenshot: `mobile-e2e/screenshots/mb-005-patient-only-flash.png`

## Not testable in Playwright (native-only)

Tracked as "native-only, not covered", not failures: LiveKit native video, camera / image-picker capture, biometric app lock (`expo-local-authentication`), push notifications, haptics, native share sheet, native sheets/detents and swipe-back gestures.
