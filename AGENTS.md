# AGENTS.md — CeenAiX AI Agent Instructions

You are working on **CeenAiX**, an AI-native healthcare platform for the UAE market built with React + TypeScript + Supabase.

## Before You Start

1. Read `CHECKLIST.md` for the current development status and what to work on next.
2. Read `docs/agent/overview.md` for platform context and tech stack.
3. Read `docs/agent/mvp-scope.md` to understand what is in scope for the current build phase.
4. Reference `docs/agent/schema-reference.md` for database tables.
5. Reference `docs/agent/routes-reference.md` for routing structure.
6. Reference `docs/agent/tech-stack.md` for coding conventions.

## Bolt UI Prototype

The UI was prototyped by the product lead using **Bolt**. Treat Bolt-generated components as the **visual reference**:

- **Preserve** Bolt's JSX structure, Tailwind classes, layout, and UX patterns.
- **Replace** Bolt's data-fetching logic, inline types, and ad-hoc table queries with spec-compliant implementations (shared types from `src/types/`, custom hooks from `src/hooks/`, canonical schema from `docs/agent/schema-reference.md`).
- **Do not rewrite** a Bolt component's appearance unless the spec explicitly requires different UX flow.
- Bolt code queries non-spec tables (`doctors`, `hospitals`, `profiles`, etc.). When building real features, use the canonical schema — **never create tables to match Bolt's ad-hoc names**.
- See `docs/agent/bolt-code-audit.md` for the full conflict matrix and migration guide.
- See `docs/agent/routes-reference.md` for the code status of every route.

## Rules

### Scope Control
- **Only implement features listed in `docs/agent/mvp-scope.md`** unless explicitly asked otherwise.
- If a user asks for something that is Phase 2+, flag it and confirm before proceeding.
- Check the phase of any feature in `docs/specs/13-phased-roadmap.md`.

### Architecture
- All data access goes through **Supabase client** (`src/lib/supabase.ts`).
- All AI calls go through **Supabase Edge Functions** — never call OpenAI directly from the frontend.
- All tables must have **Row-Level Security (RLS)** enabled. No table should be publicly accessible without RLS.
- Use the **canonical schema** from `docs/agent/schema-reference.md`. Do not create ad-hoc tables.
- During MVP development, do **not** add legacy compatibility paths, fallback reads, or dual-schema support for Bolt-era fields/tables. Move features directly onto the canonical schema.
- Appointments are the **central clinical entity** — consultations, prescriptions, lab orders, and payments reference appointments.

### Code Style
- **TypeScript strict mode** — no `any` types.
- **Functional components** only.
- **Tailwind CSS** for all styling — no CSS modules, styled-components, or inline styles.
- **Named exports** (except page components for lazy loading).
- **Custom hooks** for Supabase queries (e.g., `useAppointments()`, `usePatientProfile()`).
- Loading states use **skeleton loaders**, not spinners.
- Error states use **error boundaries** around major sections.

### File Organization
- Pages go in `src/pages/{role}/` (e.g., `src/pages/patient/Dashboard.tsx`).
- Shared components go in `src/components/`.
- Supabase client and helpers in `src/lib/`.
- Custom hooks in `src/hooks/`.
- TypeScript types in `src/types/`.
- Route definitions in `src/lib/router.tsx`.

### Auth
- Auth state managed via React Context (`src/lib/auth-context.tsx`).
- Route guards: patient pages require `role === 'patient'`, doctor pages require `role === 'doctor'`, admin pages require `role === 'super_admin'`.
- Unauthenticated → redirect to `/auth/login`.
- Wrong role → redirect to `/access-denied`.

### Database
- Use **Supabase migrations** (`supabase/migrations/`) for schema changes.
- Every migration must include RLS policies for new tables.
- Use `auth.uid()` in RLS policies to scope data access.
- Soft delete clinical data: set `is_deleted = true` and `deleted_at = now()`.
- Never hard-delete clinical records.

### AI
- See `docs/agent/ai-reference.md` for AI feature specifications and Edge Function patterns.
- AI responses must be tagged as "AI-generated" in the UI.
- Patient context must have consent check before being sent to AI.
- Guest AI sessions are ephemeral — not retained after 30 days.

## Detailed Specifications

When you need the full specification for any feature, consult:

| Topic | File |
|---|---|
| User roles and features | `docs/specs/02-user-roles.md` |
| Platform sitemap | `docs/specs/03-platform-sitemap.md` |
| User flows (13 flows) | `docs/specs/04-user-flows.md` |
| AI capabilities | `docs/specs/05-ai-capabilities.md` |
| Privacy and compliance | `docs/specs/06-privacy-and-compliance.md` |
| Technical architecture | `docs/specs/08-technical-architecture.md` |
| Data model (full) | `docs/specs/09-data-model.md` |
| Integrations | `docs/specs/10-integrations.md` |
| Non-functional requirements | `docs/specs/11-non-functional-requirements.md` |
| Phased roadmap | `docs/specs/13-phased-roadmap.md` |
| Complete route map | `docs/specs/14-route-map.md` |
| Glossary | `docs/specs/07-glossary.md` |

## Cursor Cloud specific instructions

### Services

This is a single-service SPA (no monorepo, no backend server in-repo). The only service to run locally is the **Vite dev server** (`npm run dev`, port 5173). The backend is a hosted Supabase project (dev ref: `lgfaucsfiyxvmsghnpey`).

### Environment setup

- Copy `env.template.dev` → `.env.local` (contains the dev Supabase URL and publishable anon key).
- The preview PIN gate is enabled by default — PIN is `6969`. Disable it by setting `VITE_PREVIEW_PIN_GATE=false` in `.env.local`.

### Running checks

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Unit tests | `npm run test` |
| Build | `npm run build` |
| E2E tests | `npm run test:e2e` (requires Playwright browsers: `npx playwright install`) |

### Gotchas

- `npm run test` (Vitest) picks up Playwright e2e files in `e2e/` and reports them as "failed suites" — this is a known pre-existing config gap. The actual unit tests (33 in `src/`) all pass. Run e2e tests separately with `npm run test:e2e`.
- The project uses Node 20+ (CI pins Node 20; Node 22 on this VM is compatible).
- There is no local Supabase setup (`supabase/config.toml` does not exist) — all DB access hits the remote hosted project. Migrations are applied via GitHub Actions or the Supabase CLI against the remote instance.
