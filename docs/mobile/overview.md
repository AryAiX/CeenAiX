# CeenAiX Mobile — Overview

> What we are building, why, and how it reuses the existing web patient
> portal. This is the companion to `docs/mobile/checklist.md` (the
> page-by-page source of truth) and follows the conventions in
> `AGENTS.md`, `docs/agent/mvp-scope.md`, and `docs/agent/tech-stack.md`.

## What we are building

A **patient-oriented native mobile app** for **iOS + Android**, built with
**React Native (Expo)**. The goal is **near feature-parity with the web
patient portal** (`src/pages/patient/*`), backed by the **same Supabase
project, schema, RLS, and `role === 'patient'` scoping** as the web app.

The mobile app is not a webview wrapper. It re-implements the patient
surface with native navigation and platform-native UX, while sharing the
non-visual logic (types, data-access patterns, i18n resources, constants)
with the web codebase wherever feasible.

### Patient surface in scope (mirrors `docs/agent/mvp-scope.md` → Patient Pages)

- Dashboard (health overview, next appointment, today's meds, insurance, AI tip)
- Appointments (upcoming/past list, detail, book) 
- Records (conditions, allergies, medications, vaccinations)
- Lab results
- Prescriptions (active/past)
- Messages (secure messaging with doctors)
- Notifications (notification center)
- Documents
- Profile (personal info, Emirates ID, preferences)
- AI chat entry point (calls Edge Functions only — never OpenAI directly)
- Auth (login, signup, session persistence, route guard)

## Mobile-native UX adaptations (explicit)

Where a native pattern serves patients better than a literal port of the
web layout, we adapt and **call it out here**:

| Web pattern | Mobile adaptation | Rationale |
|---|---|---|
| Left sidebar + top nav chrome | **Bottom tab navigator** (Home, Appointments, Records, Notifications, Profile) + stacks | Thumb-reachable primary nav is the iOS/Android convention |
| Email confirmation / browser redirect auth | Native auth screens; **biometric unlock** (Face ID / fingerprint) to re-open an existing session | Faster, expected re-entry on personal devices |
| Toast / in-app banners only | **Native push notifications** (Expo Notifications) for appointment reminders, new messages, lab results | Off-app reachability; this branch ships a **registration stub** only |
| Manual reload buttons | **Pull-to-refresh** on list/dashboard screens | Standard mobile refresh affordance |
| File `<input>` upload | **Camera + photo library** capture for documents / Emirates ID | Native capture is the natural mobile flow |
| URL-based navigation | **Deep links** (`ceenaix://` + universal/app links) mapping to patient routes | Push taps and shared links open the right screen |
| Always-online fetches | **Offline-friendly caching** of the last successful fetch per screen | Patients often open the app on poor connections |

These are documented as the target; this foundation branch wires the
navigation, theming, Supabase/auth, i18n, and a representative vertical
slice. Push, biometric, camera, deep links, and offline caching are
scaffolded/stubbed and tracked in the checklist for follow-up.

## Architecture decision: Expo (managed workflow)

**Decision: Expo managed workflow.** Justification:

- **Fastest cross-platform setup** — one TypeScript codebase produces iOS
  and Android with zero native Xcode/Gradle wiring for the foundation.
- **Batteries included** for everything this app needs as managed config
  plugins: `expo-router`/React Navigation, `expo-secure-store`,
  `expo-local-authentication` (biometrics), `expo-notifications` (push),
  `expo-image-picker`/`expo-camera`, `expo-linking` (deep links).
- **EAS Build / Update** gives cloud builds and OTA updates later without
  re-architecting (no need to maintain local native toolchains in CI).
- **Bare workflow is always an escape hatch** via `expo prebuild` if a
  future native module is unavailable — so choosing managed now costs us
  nothing later.

No strong reason to drop to bare RN for a patient CRUD + chat app, so we
take the managed path.

## Styling decision: NativeWind

**Decision: NativeWind (Tailwind for React Native).** Justification:

- The web app is **100% Tailwind** (`tailwind.config.js`, utility classes
  everywhere). NativeWind lets us reuse the **same class vocabulary and the
  same brand tokens** (teal/slate palette, spacing scale), keeping visual
  parity cheap and the mental model identical for anyone crossing between
  web and mobile.
- We mirror the web palette into `mobile/tailwind.config.js` and a typed
  `theme` module so non-NativeWind code (navigation options, status bar,
  charts) shares the exact same colors.

## Reuse strategy (share, don't copy)

The codebase splits cleanly into **platform-agnostic** vs **platform-specific**:

**Reusable as-is (pure TypeScript, no DOM / Vite / router):**

- `src/types/*` — all DB and enum types. **Reused directly** by the mobile
  app via a tsconfig path alias (`@ceenaix/types` → `../src/types`). No copy.
- Pure helpers in `src/lib/*` that don't touch the DOM or `import.meta.env`
  (e.g. `medication-display`, `medication-schedule`, `prescription-vocab`,
  `with-timeout`, `auth-error-messages`). Reusable; aliased on demand.
- **i18n resources** (`src/locales/{en,ar}/*.json`) — reused directly by
  the mobile i18n init via path alias (`@ceenaix/locales`).
- Validation, constants, and the **shape of the Supabase data hooks** in
  `src/hooks/*` (the query/transform logic).

**Must be platform-specific (cannot cross the web/native boundary):**

- Anything importing `react-dom`, `react-router-dom`, `createPortal`,
  `window`, `document`, or Tailwind-on-DOM classes — i.e. every
  `src/pages/**` component and `src/lib/router.tsx`.
- `src/lib/supabase.ts` — uses `import.meta.env` (Vite). Mobile needs its
  own client using `EXPO_PUBLIC_*` env, `AsyncStorage`, and
  `react-native-url-polyfill`.
- `src/lib/auth-context.tsx` — imports `react-router-dom`. Mobile
  re-implements the same auth provider against React Navigation.

### Chosen sharing approach

For this foundation pass we use **path-alias sharing into the existing
`src/`** rather than a disruptive monorepo migration:

- `mobile/tsconfig.json` maps `@ceenaix/types/*` → `../src/types/*` and
  `@ceenaix/locales/*` → `../src/locales/*`. Metro's `watchFolders` +
  `nodeModulesPaths` are configured so the bundler can resolve files
  outside `mobile/`.
- This gives **genuine, non-duplicated reuse of types and i18n today** with
  zero changes to the web build (the web `tsconfig.app.json` only includes
  `src`, so it never sees `mobile/`).

**Deeper reuse path (documented, deferred):** the highest-value next step is
to extract the **pure query/transform bodies** of the patient hooks
(`use-patient-dashboard`, `use-appointments`, `use-patient-prescriptions`,
etc.) into a `shared/` workspace package whose functions accept an injected
`SupabaseClient` instead of importing the web client. Web and mobile would
each pass their own client. That refactor touches the web hooks, so it is
intentionally **out of scope for this branch** to keep the web app frozen;
it is captured in the checklist under "Deeper reuse".

Until then, the mobile data hooks **replicate the canonical query logic**
(same tables, same columns, same `is_deleted`/status filters, same shared
types) so behavior matches the web and the eventual extraction is mechanical.

## Supabase + auth

- Reuse the **same Supabase project/env** as web (dev ref
  `lgfaucsfiyxvmsghnpey`). Mobile reads `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (analogous to web `VITE_SUPABASE_*`).
  See `mobile/.env.example`. **No secrets are committed** — only the anon
  (publishable) key is ever used client-side, and it lives in a local
  `.env` the developer creates.
- Client built with `@supabase/supabase-js` + `react-native-url-polyfill`
  and `AsyncStorage` for **session persistence** (`persistSession: true`,
  `autoRefreshToken: true`, `detectSessionInUrl: false`).
- **RLS is unchanged and authoritative.** The app only ever sends the
  patient's own auth token; all patient scoping is enforced server-side by
  existing policies. The client additionally guards routes so only
  `role === 'patient'` reaches patient screens (parity with the web
  `ProtectedRoute`).
- AI features call the existing **Supabase Edge Functions** (`ai-chat`,
  etc.) — never OpenAI directly, per `AGENTS.md`.

## Out of scope for this branch (clearly noted)

- Non-patient portals (doctor / pharmacy / lab / insurance / admin).
- App Store / Play Store submission, store listings, screenshots.
- Production push credentials (APNs key / FCM server key) and real push
  delivery — only the client-side **registration stub** is included.
- Real biometric/camera/deep-link/offline flows beyond scaffolding (the
  navigation, theming, auth, i18n, and a vertical data slice are the
  deliverable; the rest are tracked in the checklist).
- The `shared/` workspace extraction of hook logic (documented above).

## Assumptions

1. **Arabic/RTL + push are Phase 2 for web**, but this brief explicitly
   asks for an i18n EN/AR + RTL baseline and a push stub on mobile. We honor
   the brief: mobile establishes the i18n/RTL baseline by **reusing the
   existing `src/locales/{en,ar}` resources** and includes a push
   registration stub. This is foundation only and is flagged as such.
2. The **dev Supabase project** is the integration target; the developer
   supplies `mobile/.env` from `mobile/.env.example`. Running on a device
   requires a reachable Supabase URL (the hosted dev project works).
3. **Native simulators may not be runnable in this environment.** We
   therefore verify the mobile app via `tsc` typecheck (and document the
   exact `expo` run commands) rather than asserting a booted simulator.
4. The mobile app keeps **its own `package.json` / lockfile / `node_modules`**
   under `mobile/` so its React Native dependency tree never pollutes or
   breaks the web Vite build.
5. We **replicate** (not copy verbatim) the patient dashboard/appointments
   query logic against the canonical schema for the vertical slice, pending
   the documented `shared/` extraction.
6. `expo` CLI and native dependency installation require network access; if
   `npm install` inside `mobile/` cannot reach the registry in this
   environment, the scaffold, configs, and source are still committed and
   the documented install/run commands reproduce a working app on a
   connected machine.

## How to run (summary — full details in the checklist)

```bash
cd mobile
cp .env.example .env          # fill EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
npm install
npm run typecheck             # tsc --noEmit (works without a simulator)
npx expo start                # then press i (iOS) / a (Android) / w (web)
# or: npm run ios / npm run android
```

The web app is untouched and continues to run with `npm run dev` from the
repo root.
