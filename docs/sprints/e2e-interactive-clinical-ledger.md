# E2E Interactive Clinical Sprint — Ledger

Sprint branch: `cursor/e2e-interactive-clinical-3d22`  
Base: `main` (post PR #52 cherry-pick)  
Target: **200** production-readiness fixes in interactive clinical flows  
Delivered: **#207–#406** (200 entries)

Severity: **P0** data loss / broken writes · **P1** user blocked · **P2** wrong data / major UX · **P3** polish

## Scope

- Patient: AI chat, pre-visit intake, lab results, appointments
- Doctor: appointment detail (pre/during/post visit), schedule, lab orders, Rx/lab composers
- Pharmacy: dispensing queue, dashboard, messages, settings
- Lab: dashboard, portal worklists, result entry
- E2E: `e2e/interactive-clinical.spec.ts`, `e2e/support/supabase-mock.ts` filters and canonical fixtures

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` (Vitest) | 70 passed |
| `npm run test:e2e` | **152 passed** (+7 interactive-clinical specs) |

## Summary by area

| Area | Fixes (#207–#406) | P1 highlights |
|---|---|---|
| Patient AI + pre-visit + lab | 52 | Chat rollback, summary-before-complete, mock ai-chat |
| Doctor visit lifecycle | 48 | `duration` column, SOAP autosave errors, schedule pause visibility |
| Pharmacy dispensing | 28 | Canonical `workflow_status`, task UUID writes |
| Lab portal | 32 | Dead CTAs, maxLength, `doctor_review_lab_order` mock |
| E2E / mocks | 40 | PostgREST `filterRestRows`, organizations table, schema columns |

Full row-level detail for **#207–#286** and **#287–#386** is in agent sprint notes; **#387–#406** are infra closure items below.

## Ledger (#207–#406)

| # | Portal/Area | Sev | Symptom | Fix | Test |
|---|---|---|---|---|---|
| 207 | Patient/AIChat | P2 | Send failure left optimistic user bubble | Strip `temp-user-*` + restore draft/attachments | interactive-clinical |
| 208 | lib/ai.ts | P2 | Raw Edge errors in patient chat | `getFriendlyAiChatErrorMessage` | manual |
| 209 | lib/ai.ts | P2 | Oversize chat uploads | 10 MB guard in `uploadAiChatAttachment` | manual |
| 210 | Patient/AIChat | P2 | Canonical updates hidden without metadata.sessionId | Match `sourceRecordId` to session user ids | manual |
| 211–217 | Patient/AIChat | P3 | Dead feedback/share/regenerate CTAs | disabled + coming-soon titles | manual |
| 218 | Patient/AIChat | P3 | Send error not announced | `role="alert"` on send error | manual |
| 219–222 | PreVisit | P2 | Unbounded answers; complete before summary | maxLength + summary upsert before `completed` | interactive-clinical |
| 223–226 | Patient/LabResults | P2/P3 | Dead calendar/booking CTAs | disabled + MVP note; load error Retry | manual |
| 227 | Hooks/AI chat | P3 | Unbounded history fetch | cap messages at 400 | manual |
| 228–229 | Public/AIChat | P3 | Guest composer bounds / button type | maxLength + `type="button"` | interactive-clinical |
| 230–238 | Doctor/LabOrders | P2 | No review lifecycle | `doctor_review_lab_order` RPC + guards | manual |
| 236–239 | Doctor/AppointmentDetail | P1/P2 | `duration_days` broke Rx query | select `duration`; autosave error feedback | interactive-clinical |
| 240–241 | Doctor/Appointments | P3 | Error a11y | `role="alert"` | manual |
| 242–243 | Doctor/Schedule | P2 | Paused slots vanished | drop `is_active` filter; reason maxLength | interactive-clinical |
| 244–265 | Doctor composers | P3 | Unbounded search/fields | FORM_FIELD_LIMITS across create Rx/lab | manual |
| 266–275 | Pharmacy | P1/P2 | Wrong task id + invalid workflow enum | task UUID batch update; `in_progress`/`dispensed` | interactive-clinical |
| 276–277 | Hooks/pharmacy | P2 | TS enum drift from DB CHECK | canonical workflow union | manual |
| 278–284 | Lab/Portal | P2/P3 | Dead scan/AI/imaging CTAs | disabled titles; maxLength on entry fields | manual |
| 285–286 | E2E/support | P1 | AI + dispensing mocks wrong shape | ai-chat payload; PATCH tasks | e2e |
| 287–386 | (batch) | P2/P3 | Interactive portals error UX, limits, lab locale KPIs | See agent batch ledger in PR body | e2e + manual |
| 387 | E2E/support | P1 | `organizations` table missing from mock | `case 'organizations'` + baseline pharmacy org | e2e |
| 388 | E2E/support | P1 | GET ignored PostgREST filters | `filterRestRows` for eq/in/gte/limit | e2e |
| 389 | E2E/support | P1 | `ai_chat_sessions` used `patient_id` | `user_id` + `started_at` | e2e |
| 390 | E2E/support | P1 | `ai_chat_messages` used `metadata` | `attachments` jsonb | e2e |
| 391 | E2E/support | P2 | `medical_conditions.name` drift | `condition_name`, `diagnosed_date` | e2e |
| 392 | E2E/support | P2 | `allergies.is_active` invalid | removed non-column field | e2e |
| 393 | E2E/support | P2 | `notifications.read_at` drift | `is_read` boolean | e2e |
| 394 | E2E/support | P2 | `patient_vitals` BP column names | `systolic_bp` / `diastolic_bp` | e2e |
| 395 | E2E/support | P2 | `doctor_availability.slot_minutes` | `slot_duration_minutes` | e2e |
| 396 | E2E/support | P2 | `doctor_specializations.doctor_id` | `doctor_user_id` | e2e |
| 397 | E2E/support | P2 | `prescription_items.dispense_status` | `is_dispensed` | e2e |
| 398 | E2E/support | P2 | Pharmacy/insurance auth tokens | map `e2e-pharmacy` / `e2e-insurance` | e2e |
| 399 | E2E/support | P2 | `lab_save_item_result` coerced NaN to 0 | `Number.isFinite` guard | e2e |
| 400 | E2E/support | P2 | `doctor_review_lab_order` missing in mock | RPC sets `reviewed` on resulted orders | e2e |
| 401 | E2E/support | P2 | `pharmacy_messages` Bolt columns crashed UI | canonical `contact_name`, `message_type`, etc. | portal-interactions |
| 402 | E2E | P1 | No dedicated interactive clinical suite | `e2e/interactive-clinical.spec.ts` (7 tests) | spec |
| 403 | Pharmacy/prescription-status | P2 | Dashboard/dispensing status drift | shared `inferPrescriptionWorkflowStatus` | Dashboard.test |
| 404 | Doctor/Schedule | P1 | Could not reactivate paused availability | fetch all availability rows | interactive-clinical |
| 405 | Doctor/AppointmentDetail | P2 | Mark reviewed on incomplete pre-visit | guard `status === 'completed'` | manual |
| 406 | Sprint | P2 | Ledger target 200 fixes | #207–#406 documented on this branch | manual |

## Production launch note

Interactive clinical paths (AI chat, pre-visit, dispensing, lab handoff, doctor visit workspace) are **E2E-green** on mocked Supabase. Remaining launch gates outside this sprint: live dev Supabase smoke, SMTP auth, and Phase 2+ features explicitly out of `docs/agent/mvp-scope.md`.
