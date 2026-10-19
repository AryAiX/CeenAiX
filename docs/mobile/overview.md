# CeenAiX Patient App — Overview

The patient app in `mobile/` is a native iOS and Android client for the patient
portal (`src/pages/patient/*`). It was rebuilt from scratch on Expo, with a
phone-first information architecture. The backend is unchanged: it uses the
same Supabase project, canonical schema, RLS policies, RPCs and Edge Functions
as the web.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Expo SDK 58 (managed workflow + `expo-dev-client`), React Native 0.88, React 19, Hermes |
| Language | TypeScript strict; no `any` |
| Navigation | `expo-router` (file routes in `src/app/`), `NativeTabs` (UITabBar / Material bottom nav), native-stack sheets |
| Data | `@supabase/supabase-js` with an AsyncStorage session; generated copies of the web hooks |
| Video | LiveKit (`@livekit/react-native`, `@livekit/react-native-webrtc`) + config plugins |
| i18n | `i18next` with the web locales plus mobile copy under `m.*`; EN / AR with RTL |
| Native APIs | expo-image-picker, expo-document-picker, expo-local-authentication, expo-notifications, expo-web-browser, expo-clipboard, expo-haptics, expo-keep-awake, `Share` |

## Information architecture

There are five tabs, and everything else is pushed onto one stack, so the back
gesture always works.

| Tab | Screen | Pushed / presented from it |
|---|---|---|
| Home | Dashboard: next visit, today's doses, vitals, attention items, care team | Notifications, Profile, Book |
| Visits | Upcoming / Past / Cancelled segments | Appointment detail → Cancel (sheet), Reschedule (wizard), Pre-visit (full-screen), Video visit (full-screen) |
| Assistant | AI chat | Chat history (sheet) |
| Messages | Conversation list with search | Conversation thread (realtime) |
| Health | Grouped hub | Records, Lab results, Prescriptions, Imaging, Documents, Insurance, Profile, Settings |

Auth lives outside the app group: sign-in, sign-up, forgot password, phone
OTP, reset password (from the `ceenaix://reset-password` deep link) and
onboarding. A non-patient role sees the `patient-only` screen, which mirrors
the web `/access-denied` guard.

## Mobile UX decisions (vs. web)

- **One step per screen.** Booking is a wizard (doctor → time → reason → review), and reschedule skips the doctor step. Pre-visit shows one question per screen, with an intro, a review list and record-update review as separate steps.
- **Native sheets** replace web modals for cancel, the pharmacy picker, record add/edit, document upload and chat history.
- **Segmented controls** replace web tabs and filters on visits, records, labs, prescriptions, imaging, insurance and notifications.
- **Date strip and slot chips** replace the web month grid. Only days that have open slots are shown.
- **Native actions** replace web-only affordances: action sheets, the share sheet (lab and imaging reports, document links), in-app browser for signed URLs, `mailto:` for support and insurer contact, Apple Maps or `geo:` for directions, long-press to copy or share AI replies, and long-press to edit or delete your own messages (5-second undo).
- **States.** Every list has a skeleton loader, an empty state and an error state with retry. Cached data shows an offline banner. Every route exports an error boundary.
- **Feel.** Haptics on taps, success and error; safe areas; keyboard avoidance using the real header height; dark mode with a system/light/dark setting; RTL with directional icons.

## Data layer

- `src/data/web/{hooks,lib}` is **generated** from the web (`npm run sync:web`). Only import paths are rewritten: the Supabase client becomes the native one, and `use-query` becomes the mobile hook with the same contract. Running `npm run sync:web -- --check` fails when the copy is stale.
- `src/data/*.ts` holds query-for-query mirrors of logic that lives *inside* web pages rather than hooks: booking/reschedule/cancel with notifications, the messaging list and thread, record CRUD, documents, profile, pre-visit persistence, preferences and reported medications. Each file names its web source.
- `useOfflineCache(result, key)` persists the last successful payload per user. When a fetch fails, it serves that copy with `staleSince`.
- **Realtime:** the messages thread (`postgres_changes` on `messages`) plus the notification and unread-message badges.
- RLS is the only authority. The app never uses a service-role key, never adds tables or columns, and soft-deletes clinical data (`is_deleted`, `deleted_at`) exactly as the web does.

## AI

- All AI goes through Supabase Edge Functions: `ai-chat` for the assistant and the pre-visit summary. The app never calls OpenAI.
- **Consent:** sending patient context (`usePatientContext`) is opt-in on mobile. The patient chooses in the assistant or in Settings, and the choice is stored per user on the device. The web currently sends context on every message, and the schema has no consent table yet, so this setting is device-local.
- Every AI output carries the "AI-generated" tag (assistant replies, the pre-visit summary on the appointment and intake screens). Assistant replies render Markdown with a small built-in renderer and show evidence ("Used: …") and suggested in-app actions.
- Chat-derived record updates use the same review → apply / dismiss flow as the web.

## Native capabilities

| Capability | Status |
|---|---|
| Camera / photo library / files | Wired (documents, avatar, Emirates ID, insurance card, AI attachments) |
| Biometric re-unlock | Wired (`expo-local-authentication`, toggle in Settings) |
| Deep links `ceenaix://` | Wired (`webPathToHref` maps web paths; auth redirects for reset password and email confirmation) |
| Realtime | Wired (messages thread, unread badges) |
| Offline last-fetch cache | Wired (dashboard and all list screens) |
| Video visits | Wired; needs a dev or store build (WebRTC is not in Expo Go) |
| Push notifications | **Stub.** Permission and Expo token only; no server-side token storage or APNs/FCM delivery yet |

## Security

- `mobile/.env` (git-ignored) holds only `EXPO_PUBLIC_SUPABASE_URL` and the publishable anon key. `mobile/.env.example` documents the variables.
- Sessions live in AsyncStorage. The biometric lock hides the UI on resume, but it does not encrypt storage.
- Signed storage URLs are short-lived (1 hour for shared document links) and open in the in-app browser.
