# App-Wide 200-Fix + Multi-Actor E2E Sprint — Ledger

Sprint branch: `cursor/app-wide-200-e2e-multi-actor-3d22`  
Continues from: `e2e-interactive-clinical-ledger.md` (**#207–#406**)  
This sprint: **#407–#606** (200 entries)

## Deliverables

| Deliverable | Detail |
|---|---|
| Code fixes | 200 items across auth, admin, insurance, patient, doctor, pharmacy, lab, public, shared components |
| E2E | New `e2e/multi-actor-scenarios.spec.ts` — **50** multi-actor tests (2–5 roles) |
| Mock layer | Insurance/admin/messaging stubs, `filterRestRows`, `getE2eWorkflowSnapshot`, `resetPharmacyDispensingTasks` |

## E2E coverage (after sprint)

| File | Tests (approx.) | Focus |
|---|---|---|
| `clinical-workflows.spec.ts` | 23 | Single-role clinical writes |
| `interactive-clinical.spec.ts` | 7 | AI, dispensing, visit UI |
| `multi-role-interactions.spec.ts` | 1 | 5-role booking chain |
| `multi-actor-scenarios.spec.ts` | **49** | 2–5 actor pathways + uncovered routes |
| `portal-interactions.spec.ts` | 24 | Portal smoke + auth guards |
| `role-journeys.spec.ts` | 2 | Login / onboarding |
| **Total** | **~205** | All mocked, deterministic |

## Fix batches

- **#407–#526** — App-wide UX: `maxLength`, `role="alert"`, hook error Retry, dead CTA titles, auth/onboarding bounds, admin load errors, messaging errors, `window.confirm` → inline confirm (`AccountSecurityPanel`).
- **#527–#606** — E2E mock parity: insurance tables, consultation_notes, pharmacy inventory batches, messaging PATCH, RPC defaults, embed relations, portal route smokes.

See agent sprint notes in PR #54 for row-level **#407–#526** and **#527–#606** tables.

## Multi-actor E2E scenarios (49)

| Group | Count | Actors |
|---|---|---|
| Two-actor handoffs | 10 | patient↔doctor, patient↔insurance, doctor↔lab, etc. |
| Three-actor pathways | 10 | patient→doctor→lab/pharmacy/insurance/admin |
| Four/five-actor | 6 | Up to patient+doctor+lab+pharmacy+insurance |
| Uncovered routes + context | 23 | Admin/insurance/pharmacy routes with patient/doctor context |

## Verification

Run before merge:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
```
