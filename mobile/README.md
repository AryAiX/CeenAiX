# CeenAiX app (Expo shell)

Native iOS and Android app that loads the CeenAiX web portal in a full-screen
web view. Every screen is the web app itself (`src/pages/*`), so the app always
matches the website. See `docs/mobile/overview.md` for what the shell adds.

## Requirements

- Node 20+
- Xcode 26+ (iOS) and/or Android Studio with an emulator
- `eas-cli` for cloud builds and store submission

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_WEB_URL, defaults to https://www.ceenaix.com
```

## Run

| Task | Command |
|---|---|
| Build and run on the iOS simulator | `npm run ios` |
| Build and run on an Android emulator | `npm run android` |
| Start Metro for an installed dev build | `npm start` |
| Type check | `npm run typecheck` |

## Builds

| Profile | Loads | Use |
|---|---|---|
| `development` | `EXPO_PUBLIC_WEB_URL` from the EAS development environment (dev.ceenaix.com) | Simulator dev client |
| `preview` | EAS preview environment | Internal device builds |
| `production` | EAS production environment (set `EXPO_PUBLIC_WEB_URL=https://www.ceenaix.com`) | App Store / Play Store |

```bash
eas build --profile production --platform ios
eas submit --platform ios
```
