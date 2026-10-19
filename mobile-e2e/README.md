# mobile-e2e

Playwright tests for the CeenAiX patient app (`mobile/`), run against its Expo web build.

```bash
cp .env.example .env             # fill in SMOKE_PATIENT_PASSWORD (DEV smoke patient)
npm install
npx playwright install chromium webkit
npm run build:app                # cd ../mobile && npx expo export --platform web
npm test                         # serves ../mobile/dist on :4173 and runs all projects
npm run test:iphone              # or test:pixel / test:rtl
```

Set `MOBILE_E2E_BASE_URL` to test an already-running server (e.g. `npx expo start --web`).

- Projects: `iphone-14` (WebKit 390x844), `pixel-7` (Chromium 412x915), `rtl-ar` (Chromium 412x915, `ar-AE`).
- `setup` signs in once and stores the session in `.auth/` (git-ignored).
- Each test fails on unexpected console errors or page errors (`support/fixtures.ts`).
- Screenshots for iPhone and RTL are written to `screenshots/<project>/`.
- Endpoints that would send SMS or email, or create accounts, are mocked (`support/auth-mocks.ts`).
- `scripts/` holds ad-hoc debugging tools; they are not part of the suite.
