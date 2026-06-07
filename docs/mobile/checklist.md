# CeenAiX Mobile — Build Checklist

> Source of truth for the React Native (Expo) patient app. Mirrors the web
> patient portal page-by-page (`src/pages/patient/*`) plus mobile-platform
> setup. Update checkboxes as work lands. Companion to
> `docs/mobile/overview.md`.
>
> Legend: `[x]` done · `[~]` partial / scaffolded · `[ ]` not started.

---

## 0. Branch & process

- [x] Create branch `mobile-6-1` from `origin/main`
- [x] Plan + checklist committed before building
- [ ] Small focused commits per workstream
- [ ] Push `-u origin mobile-6-1` and open **draft** PR (do not merge)
- [x] Exclude unrelated `docs/reviews/pr-70-review.md` from commits

---

## 1. Mobile platform setup

### 1.1 Project scaffold
- [ ] Expo TypeScript app under `mobile/` (own `package.json` / lockfile)
- [ ] TypeScript **strict** mode, `no any`
- [ ] `mobile/.gitignore` (node_modules, .env, .expo, build artifacts)
- [ ] `mobile/README.md` with run/build instructions
- [ ] Does **not** break web build (web tsconfig only includes `src`; eslint ignores `mobile`)

### 1.2 Navigation
- [ ] React Navigation installed (native stack + bottom tabs)
- [ ] Root navigator switches Auth stack vs App (tabs) on session
- [ ] Bottom tab navigator: Home · Appointments · Records · Notifications · Profile
- [ ] Stack navigators per tab for detail screens
- [ ] Deep linking config (`ceenaix://`) — scaffolded, routes stubbed

### 1.3 Theming / design system
- [ ] NativeWind configured (`tailwind.config.js`, `global.css`, babel)
- [ ] Brand tokens mirrored from web (`teal`/`slate`, spacing) into `theme.ts`
- [ ] Shared typed `theme` for non-NativeWind surfaces (nav, status bar)
- [ ] Reusable primitives: `Screen`, `Card`, `Button`, `Skeleton`, `ErrorState`

### 1.4 Supabase client
- [ ] `@supabase/supabase-js` + `react-native-url-polyfill` + `AsyncStorage`
- [ ] Client with `persistSession` + `autoRefreshToken`, `detectSessionInUrl: false`
- [ ] Reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] RLS preserved; only patient token sent (no service role)

### 1.5 Auth / session persistence
- [ ] Auth context (parity with web `auth-context.tsx`, sans react-router)
- [ ] Session hydrate + `onAuthStateChange` subscription
- [ ] Loads `user_profiles` + `patient_profiles`; exposes `role`
- [ ] Route guard: only `role === 'patient'` reaches app tabs
- [ ] Sign out
- [ ] Biometric unlock (Face ID / fingerprint) — `expo-local-authentication` deferred

### 1.6 Env config
- [ ] `mobile/.env.example` (`EXPO_PUBLIC_*`, no secrets)
- [ ] Typed env accessor with friendly missing-var warning

### 1.7 i18n (EN + Arabic / RTL)
- [ ] i18next + react-i18next init for RN
- [ ] Reuse existing `src/locales/{en,ar}` resources via path alias
- [ ] Language switch persisted (AsyncStorage)
- [ ] RTL handling baseline (`I18nManager` flip on Arabic)

### 1.8 Push notifications (stub)
- [ ] `expo-notifications` permission + token registration **stub** (no prod credentials)
- [ ] Wire appointment / message / lab-result push (Phase 2, needs APNs/FCM)

### 1.9 Native capture & offline (foundation)
- [ ] Camera / image-picker for document + Emirates ID capture — deferred hook
- [ ] Pull-to-refresh wired on data screens (RefreshControl)
- [ ] Offline-friendly last-fetch caching — pattern documented, deferred

### 1.10 Build / run
- [ ] `npm run typecheck` (tsc) for mobile
- [ ] Documented: `npx expo start`, `npm run ios`, `npm run android`, `npm run web`
- [ ] EAS build profile (`eas.json`) — deferred (no store submission this branch)

### 1.11 Testing
- [ ] Test setup note (jest-expo) — documented; unit tests deferred
- [ ] Typecheck is the green gate for this foundation pass

---

## 2. Shared code reuse

- [ ] `src/types/*` reused via `@ceenaix/types` path alias (no copy)
- [ ] `src/locales/*` reused via `@ceenaix/locales` path alias (no copy)
- [ ] Metro configured to resolve files outside `mobile/`
- [ ] Mobile data hooks replicate canonical query logic (same tables/columns)
- [ ] **Deeper reuse:** extract pure hook query/transform bodies into a
      `shared/` workspace package that accepts an injected `SupabaseClient`
      (touches web hooks → deferred; see overview.md)

---

## 3. Patient screens (parity with `src/pages/patient/*`)

### 3.1 Auth — Login + Signup (`/auth/login`, `/auth/register`)
- [ ] Login screen (email + password) → Supabase `signInWithPassword`
- [ ] Signup screen (name, email, password, terms) → `signUpWithPassword` (role `patient`)
- [ ] Loading + error states; friendly auth error messages
- [ ] Redirect to tabs on authenticated patient session
- [ ] Phone OTP login (Phase 2 parity)
- [ ] Forgot password flow

### 3.2 Dashboard (`/patient/dashboard`) — **vertical slice (real data)**
- [ ] Greeting + health score / adherence header
- [ ] Stat cards (HbA1c, blood pressure, last labs, medications)
- [ ] Next appointment card (doctor, specialty, time, countdown)
- [ ] Today's medications list (mark-taken affordance)
- [ ] Insurance summary card
- [ ] AI health tip card (entry to AI chat)
- [ ] Bound to real Supabase data (canonical schema, RLS-scoped)
- [ ] Loading skeletons + error state + pull-to-refresh
- [ ] HbA1c / BP trend charts (web uses SVG; mobile chart deferred)

### 3.3 Appointments (`/patient/appointments`, `/:id`, `/book`) — **slice (real data)**
- [ ] Upcoming / past list from `appointments` (RLS-scoped, `is_deleted=false`)
- [ ] Status chips, doctor name + specialty resolution
- [ ] Loading + error + empty + pull-to-refresh
- [ ] Appointment detail screen (stack route scaffolded)
- [ ] Booking flow (doctor → date → time → confirm)
- [ ] Cancel / reschedule

### 3.4 Records (`/patient/records`)
- [ ] Screen scaffolded (tab route) — conditions / allergies / meds / vaccinations
- [ ] Bind to `medical_conditions`, `allergies`, `vaccinations`
- [ ] Manual entry forms

### 3.5 Prescriptions (`/patient/prescriptions`)
- [ ] Screen scaffolded — active / past prescriptions
- [ ] Bind to `prescriptions` + `prescription_items` (+ catalog hydration)
- [ ] Pharmacy status display

### 3.6 Lab results (`/patient/lab-results`)
- [ ] List doctor-uploaded results (`lab_orders` + `lab_order_items`)
- [ ] AI plain-language explanation (Edge Function)

### 3.7 Messages (`/patient/messages`, `/:id`)
- [ ] Conversation list (`conversations` / `messages`)
- [ ] Conversation detail + send
- [ ] Realtime subscription + unread counts

### 3.8 Notifications (`/patient/notifications`)
- [ ] Screen scaffolded (tab route)
- [ ] Bind to `notifications` (mark read, action routing)

### 3.9 Documents (`/patient/documents`)
- [ ] List documents (Supabase Storage `documents` / `medical-files`)
- [ ] Camera / library capture + upload (Emirates ID, files)

### 3.10 Profile (`/patient/profile`)
- [ ] Screen scaffolded (tab route) — shows profile + sign out
- [ ] Edit personal info, Emirates ID, notification preferences
- [ ] Avatar upload

### 3.11 AI chat (`/patient/ai-chat`)
- [ ] Chat UI; calls `ai-chat` Edge Function (never OpenAI direct)
- [ ] Patient-context consent check before sending context
- [ ] "AI-generated" tagging in UI

---

## 4. Cross-cutting / compliance (per AGENTS.md)

- [ ] Canonical schema only — no ad-hoc tables
- [ ] All data access via Supabase client; patient-scoped by RLS
- [ ] No secrets committed
- [ ] AI calls via Edge Functions only (when AI screens land)
- [ ] TypeScript strict, functional components, named exports
- [ ] Loading skeletons / spinners + error states on data screens

---

## 5. Verification gate

- [ ] Mobile `tsc --noEmit` passes
- [ ] Web `npm run lint` passes (unchanged)
- [ ] Web `npm run typecheck` passes (unchanged)
- [ ] Web `npm run build` passes (unchanged)
