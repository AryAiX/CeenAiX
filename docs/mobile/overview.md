# CeenAiX App — Overview

The app in `mobile/` is a thin native shell (Expo, React Native) around the web
portal. It opens `EXPO_PUBLIC_WEB_URL` (production: `https://www.ceenaix.com`)
in a full-screen `react-native-webview`, starting at `/auth/login?role=patient`.
The login page sends a signed-in patient straight to their portal.

There are no native copies of web screens. Any change to `src/pages/*` ships to
the app as soon as the website is deployed, with no app update.

## What the shell adds

| Feature | Behaviour |
|---|---|
| Splash screen | Native splash stays up until the first page finishes loading (10 s cap). |
| Offline screen | A failed page load shows a native "You are offline" card with **Try again**. |
| Face ID / fingerprint re-lock | After 5 minutes in the background, a signed-in user (any path outside `/` and `/auth/*`) must unlock with biometrics. Skipped when the device has no enrolled biometrics. |
| Privacy cover | The app switcher shows a blank screen instead of health data. |
| Video visits | Camera and microphone are granted to the portal origin for LiveKit consultations (`mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"`). |
| Uploads | `<input type="file">` uses the native camera, photo library and file picker. |
| External links | Other sites open in an in-app browser sheet. Maps, Waze, WhatsApp, `tel:`, `mailto:` and similar links open the native app. |
| Deep links | `ceenaix://<path>` opens `<web url>/<path>`, e.g. `ceenaix://patient/appointments`. |
| Navigation | iOS swipe-back and the Android back button move back through web history. |
| Language | Native screens (offline, lock) follow the device language (English / Arabic). The portal keeps its own language switch. |

The web view user agent ends with `CeenAiXApp/1.0`, and `window.CeenAiXApp`
(`{ platform }`) is defined before the page loads, so the web app can detect the
shell if it ever needs to.

## Preview PIN

`www.ceenaix.com` and `dev.ceenaix.com` show the pre-launch preview PIN
(`src/lib/preview-access.ts`). The shell marks preview access as granted before
each page loads, so app users and App Store reviewers go straight to sign-in.
The PIN is a client-side gate only; it never protected data.

## Not in the shell yet

- **Push notifications.** Needs APNs/FCM credentials and a table for device tokens (not in the canonical schema yet).
- **File downloads triggered by `<a download>` or blob URLs.** Signed document links open in the in-app browser instead.

## Security

- The shell holds no keys. Supabase auth, RLS and Edge Functions are exactly the web app's.
- The session lives in the web view's storage (WKWebView / Android WebView), like a browser.
- Only the portal origin can use the camera and microphone without a prompt; other origins never load at top level inside the web view.
