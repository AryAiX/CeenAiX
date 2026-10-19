# CeenAiX Patient App — Checklist

Status of the Expo app in `mobile/`. Architecture and UX decisions are in [overview.md](./overview.md). QA handoff and testIDs are in [test-handoff.md](./test-handoff.md).

## Screens

Every web patient page and auth page has a native screen. All of them run in the Expo web build too.

| Area | Screen | Status |
|---|---|---|
| Auth | Sign in (email/password, phone OTP), Sign up (email or phone), OTP, Forgot password, Reset password, Onboarding, Patient-only gate | Done |
| Home | Dashboard (next visit, quick actions, health score, medications, messages, activity, care team, insurance) | Done |
| Visits | Appointments list, Appointment detail, Cancel, Book / Reschedule wizard, Pre-visit intake, Video visit | Done (video needs a dev build) |
| AI | Assistant chat (consent, attachments, record-update review), Chat history | Done |
| Messages | Inbox, Conversation (realtime, edit/delete) | Done (no message attachments; same as web) |
| Health | Hub, Records + record form, Lab results + detail, Prescriptions + detail + pharmacy picker, Imaging + detail, Documents + upload, Insurance | Done |
| Account | Notifications, Profile (avatar, personal, Emirates ID, insurance), Settings | Done |

Known gaps compared with the web, all intentional:
- Family members are not ported, because on the web they exist only in local state.
- Notifications cannot be dismissed, because the `notifications` table has no `is_deleted` column.
- The booking specialty filter is single-select.

## Quality bar

- [x] Brand tokens and light/dark themes (system, light or dark, chosen in Settings).
- [x] EN/AR with RTL (`I18nManager` on native, `dir` on `<html>` on web).
- [x] Skeleton loaders, empty states, error states with retry, and route and root error boundaries.
- [x] Haptics, safe areas and keyboard avoidance (no-ops on web where they don't apply).
- [x] Offline last-fetch cache with a stale banner.
- [x] Stable `testID`s on screens, tabs, buttons, inputs, list items and states. Conventions are in `test-handoff.md`.
- [x] AI only through the `ai-chat` Edge Function, tagged AI-generated, with the patient-context consent toggle.

## Verification

Run from `mobile/` unless noted otherwise.

| Command | Expected |
|---|---|
| `npm ci` | Installs cleanly |
| `npm run typecheck` | No errors (TypeScript strict) |
| `npm run check:i18n` | Every literal key resolves in EN and AR |
| `npm run sync:web -- --check` | Generated data layer matches the web hooks |
| `npm run format:check` | Prettier clean |
| `npx expo export --platform ios` / `android` / `web` | Bundles export (`web` writes `mobile/dist`) |
| `npx expo start --web --port 8081` | App serves on port 8081 |
| `npx expo-doctor` | 18/20. The two failures are expected; see below |
| Repo root: `npm ci && npm run lint && npm run typecheck && npm run build` | Web app still green |

### Expected `expo-doctor` failures

1. **Metro config.** `metro.config.js` sets `disableHierarchicalLookup` and limits `nodeModulesPaths` to `mobile/node_modules`. Shared files under `../src/lib` and `../src/types` would otherwise resolve the web app's React 18 from the repo root.
2. **Duplicate React.** Doctor sees `react@18.3.1` in the repo-root `node_modules` (the web app). Metro never bundles it, for the reason above.

## Blockers and next steps

| Blocker | Next step |
|---|---|
| LiveKit video needs native WebRTC, which Expo Go doesn't have | `eas build --profile development` (or `npx expo run:ios` / `run:android`), then install the dev client. Expo Go and web show the "requires the app" state |
| Password-reset deep link | Add `ceenaix://reset-password` and `ceenaix://` (email confirmation) to the Supabase Auth redirect allow-list for each environment. For Expo web, also add the web origin's `/reset-password` (e.g. `http://localhost:8081/reset-password`) |
| Push notifications are a stub | Upload APNs key and FCM credentials to EAS (`eas credentials`), then store Expo push tokens in a canonical table and send from an Edge Function. Local badge and permission handling are already in place |
| EAS `projectId` | Run `eas init` to create the project. It writes `extra.eas.projectId` to `app.json`, which is required for push tokens and EAS Update |
| Store builds | Configure EAS environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) for preview/production, then `eas build --profile production` |
