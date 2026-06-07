# Pharmacy Access Denied Fix

## Root Cause

The landing page portal preview owned its own hardcoded portal routes instead of using the shared role-to-dashboard mapping from `src/lib/auth-context.tsx`. That allowed the preview grid to drift from canonical protected portal destinations and was not covered by the existing role-journey tests because the E2E auth mock did not include a pharmacy user.

## Files Changed

- `src/pages/public/Home.tsx` now derives portal preview destinations from `getDefaultRouteForRole`, so the Pharmacy Portal card routes to the canonical `/pharmacy/dashboard` entry.
- `e2e/role-journeys.spec.ts` now covers pharmacy protected entry, pharmacy wrong-role denial, direct pharmacy dashboard use, and the landing page Pharmacy Portal click for both matching and mismatched roles.
- `e2e/support/supabase-mock.ts` already includes a pharmacy E2E user/session role on `main` after PR #71, so no additional mock change was needed on this branch.

## How To Verify

1. Sign in as a pharmacy user.
2. Open `/`.
3. Click the `Pharmacy Portal` preview card.
4. Verify the app navigates directly to `/pharmacy/dashboard` and the pharmacy dashboard loads.
5. Sign in as a non-pharmacy role, repeat the click, and verify the app still lands on `/access-denied`.

## Tests Run

- `npm run lint` - passed.
- `npm run typecheck` - passed.
