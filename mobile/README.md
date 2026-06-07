# CeenAiX Mobile (React Native / Expo)

Patient-oriented native iOS + Android app for CeenAiX. Shares the same
hosted Supabase backend, schema, RLS, and `role === 'patient'` scoping as
the web patient portal.

See the plan and the page-by-page build status:

- `../docs/mobile/overview.md` — architecture, reuse strategy, decisions
- `../docs/mobile/checklist.md` — source-of-truth build checklist

## Stack

- **Expo** (managed workflow), React Native 0.85, React 19, TypeScript (strict)
- **React Navigation** — bottom tabs + native stacks
- **NativeWind** (Tailwind for RN) — mirrors the web brand tokens
- **@supabase/supabase-js** + AsyncStorage + `react-native-url-polyfill`
- **i18next / react-i18next** — reuses the web `src/locales/{en,ar}` resources

## Prerequisites

- Node 20+ (Node 22 works)
- The Expo Go app on a device, or an iOS Simulator / Android Emulator
- Network access to the hosted Supabase project

## Setup

```bash
cd mobile
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
```

The Supabase URL/anon key are the **same backend** as the web app (see the
web `.env.example`; dev project ref `lgfaucsfiyxvmsghnpey`). Only the anon /
publishable key is used — never the service role key.

## Run

```bash
npx expo start          # interactive: press i (iOS), a (Android), w (web)
npm run ios             # open iOS Simulator
npm run android         # open Android Emulator
npm run web             # run in a browser (RN Web)
```

## Verify (no simulator required)

```bash
npm run typecheck       # tsc --noEmit — the green gate for this foundation
```

## Shared code with the web app

This app reuses platform-agnostic web modules **without copying** via path
aliases (configured in `tsconfig.json` + `metro.config.js`):

- `@ceenaix/types` → `../src/types` (all DB / enum types)
- `@ceenaix/locales/*` → `../src/locales/*` (EN/AR translation JSON)

Platform-specific concerns (Supabase client, auth context, navigation,
screens) live under `src/` here because their web equivalents depend on
`react-dom` / `react-router-dom` / Vite env / the DOM. The deeper-reuse plan
(extracting pure hook query logic into a shared package) is documented in
`../docs/mobile/overview.md`.

## Project layout

```
mobile/
  App.tsx                 app entry (i18n init, providers, navigator)
  src/
    components/ui.tsx      Screen, Card, Button, Skeleton, ErrorState, ...
    context/auth-context   Supabase auth provider (patient-scoped)
    hooks/                 use-query, use-patient-dashboard, use-patient-appointments
    i18n/                  i18next init reusing web locales + RTL baseline
    lib/                   supabase client, env, theme tokens, push stub
    navigation/            root navigator (auth stack <-> bottom tabs)
    screens/               auth/ + patient/ screens
```
