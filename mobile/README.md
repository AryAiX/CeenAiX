# CeenAiX patient app (Expo / React Native)

Native iOS and Android app for the CeenAiX **patient** portal. It talks to the
same hosted Supabase project as the web app, through the same RLS policies,
RPCs and Edge Functions. See `docs/mobile/overview.md` for the architecture and
`docs/mobile/checklist.md` for screen status and open blockers.

## Requirements

- Node 20+
- Xcode 26+ (iOS) and/or Android Studio with an emulator
- An Expo account and `eas-cli` for cloud builds (optional)

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # fill in the dev Supabase URL + publishable anon key
```

Only the **publishable anon key** belongs in `.env` (git-ignored). Never put a
service-role key in the app — every `EXPO_PUBLIC_*` value ships in the bundle.

## Run

| Task | Command |
|---|---|
| Dev build on iOS simulator (first time / after native changes) | `npm run ios` |
| Dev build on Android emulator | `npm run android` |
| Start Metro for an installed dev build | `npm start` |
| Expo Go (no video visits, no biometric prompt on some devices) | `npm run start:go` |

Video visits (LiveKit / WebRTC) need a **development or store build**; in Expo
Go the visit screen explains this instead of crashing.

## Checks

| Task | Command |
|---|---|
| Type check (strict) | `npm run typecheck` |
| Every literal `t('…')` key exists in EN and AR | `npm run check:i18n` |
| Generated web data layer is up to date | `npm run sync:web -- --check` |
| Expo dependency / config health | `npm run doctor` |
| Bundle smoke test | `npm run export:ios` / `npm run export:android` |

## Shared web code

- `src/data/web/**` is **generated** from the web hooks by `npm run sync:web`.
  Do not edit it — change the web hook and re-run the script.
- `@ceenaix/types` and `@ceenaix/shared/*` are path aliases to the web
  `src/types` and pure `src/lib` helpers.
- Web locales (`src/locales/{en,ar}`) are loaded as-is; mobile-only copy lives
  under `m.*` in `src/i18n/strings/{en,ar}.ts`.
