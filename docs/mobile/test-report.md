# CeenAiX Patient Mobile App — QA Test Report

QA branch: `mobile-patient-parity-tests` (tracks builder branch `mobile-patient-parity`).
Harness: Playwright against the Expo web export (`mobile/dist`), see `mobile-e2e/`.
Projects: `iphone-14` (WebKit, 390x844), `pixel-7` (Chromium, 412x915), `rtl-ar` (Chromium, 412x915, `ar-AE`).

Last updated: 2026-10-19 — builder commit `075d20c`. Handoff file `docs/mobile/test-handoff.md` not present yet.

## Status

**BLOCKED at `075d20c`:** the web build does not boot (MB-001, MB-002, MB-003). No screen can be exercised in Playwright until these are pushed.

## Per-screen results

| Screen | Commit tested | Result | Specs | Notes |
|---|---|---|---|---|
| App boot (all screens) | 075d20c | fail | — | Blank white screen; see MB-002 / MB-003 |

## Bugs

### MB-001 — Web export fails: `react-dom` / `react-native-web` missing
- Severity: P1 (blocks all web/Playwright testing)
- Screen: build
- Status: open
- Steps: `cd mobile && npm install && npx expo export --platform web`
- Expected: web bundle exported to `mobile/dist`.
- Actual: `CommandError: It looks like you're trying to use web support but don't have the required dependencies installed. Install react-dom@19.3.0, react-native-web@^0.21.4`.
- Fix: `npx expo install react-dom react-native-web` and commit `package.json` + lockfile. (QA works around this locally with `npm install --no-save`; nothing committed.)

### MB-002 — App crashes on boot on web: `Notifications.useLastNotificationResponse()` throws
- Severity: P0 (blank screen on every route)
- Screen: root layout (`mobile/src/app/_layout.tsx`)
- Status: open
- Steps: build web (with MB-001 workaround), open `/` at 390x844.
- Expected: sign-in screen.
- Actual: blank screen. The swallowed error (captured by patching the dev bundle) is
  `The method or property ExpoNotifications.getLastNotificationResponse is not available on web`,
  thrown from `Notifications.useLastNotificationResponse()` in `RootNavigator`.
- Fix: guard with `Platform.OS !== 'web'` (e.g. a `useLastNotificationResponse` wrapper that returns `null` on web, or a `.web.ts` platform file).
- Screenshot: `mobile-e2e/screenshots/mb-002-root-crash.png`

### MB-003 — Root `ErrorBoundary` needs `ThemeProvider`, so any root error becomes an opaque crash
- Severity: P1
- Screen: root layout / `RouteErrorBoundary` (`mobile/src/components/ui/layout.tsx`)
- Status: open
- Steps: any error thrown inside `RootLayout` (e.g. MB-002).
- Expected: the error state with Retry.
- Actual: `src/app/_layout.tsx` re-exports `RouteErrorBoundary`, which calls `useTheme()`. At the root, the boundary renders outside `ThemeProvider`, so it throws `useTheme must be used within ThemeProvider` and the original error is lost (blank screen in production, same on native).
- Fix: give the root layout its own boundary that does not depend on providers (static colors), or make `useTheme` fall back to the light palette when there is no provider.

### MB-004 — Invalid style `direction` on the OTP cells (web console error)
- Severity: P3
- Screen: Phone OTP (`mobile/src/app/(auth)/otp.tsx`, `styles.cells`)
- Status: open
- Steps: load the app on web.
- Expected: no console errors.
- Actual: `Invalid style property of "direction". Did you mean "writingDirection"?` (react-native-web rejects `direction`).
- Fix: on web, use `writingDirection: 'ltr'` or apply `direction` only on native.

## Not testable in Playwright (native-only)

Tracked as "native-only, not covered", not failures: LiveKit native video, camera / image-picker capture, biometric app lock (`expo-local-authentication`), push notifications, haptics, native share sheet, native sheets/detents and swipe-back gestures.
