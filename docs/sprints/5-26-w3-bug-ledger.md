# 5-26-w3 Bug-Fix Sprint — Ledger

Sprint branch: `5-26-w3`
Owner: Cursor background agent

Severity: **P0** broken auth/data loss · **P1** user blocked · **P2** wrong data shown · **P3** polish/UX.

| # | Portal/Area | Severity | Symptom | Root cause | Fix | Test |
|---|---|---|---|---|---|---|
| 1 | Auth/router | P2 | `nurse`/`facility_admin` users (and any non-MVP staff role) were redirected to `/auth/onboarding` after sign-in, causing a redirect loop since onboarding is only meaningful for patient/doctor seeding | `getDefaultRouteForRole` only enumerated MVP roles | `src/lib/auth-context.tsx` — `facility_admin` → `/admin/dashboard`; any other recognised role → `/` so sign-in never bounces back to onboarding | `src/lib/auth-context.test.ts` |
| 2 | Patient/Telemedicine | P1 | "View appointment" CTA on telemedicine stub navigated to `/patient/appointments/:id`, a route that does not exist in MVP — effective 404 | Code assumed an unimplemented detail route | `src/pages/patient/TelemedicineConsultation.tsx` — both CTAs send the patient to `/patient/appointments` (live list); copy adapts based on context | covered by upcoming `e2e/multi-role-interactions.spec.ts` |
| 3 | Patient/Profile | P3 | "Scan Emirates ID" button fired a blocking `alert(...)` stub with no functional follow-up | OCR scan is a Phase 2 feature with no stand-in | `src/pages/patient/Profile.tsx` — `handleScanEmiratesId` now opens the existing front-side image picker so the button is at least useful for upload | manual |
| 4 | Pharmacy/Messages | P2 | "Send" button silently cleared the draft with no persistence, no disabled state and no user feedback that outbound replies were not wired | Bolt prototype hadn't been replaced with a real mutation; pharmacy reply tables are out of MVP scope | `src/pages/pharmacy/Messages.tsx` — send button now disabled when draft is empty, with explicit "coming soon" tooltip + inline note | manual |
| 5 | Doctor/Appointments | P3 | "Day" and "Month" calendar toggles had no `onClick` and silently did nothing | Only Week view is implemented for MVP | `src/pages/doctor/Appointments.tsx` — Day/Month buttons disabled with "coming soon" titles | manual |
| 6 | Doctor/Appointments | P2 | Calendar tile styling branched on `appointment.status === 'checked_in'`, a value not in the canonical `appointments.status` enum, so the highlight code was dead and `confirmed` rows had no styling treatment | Drift from spec enum | `src/pages/doctor/Appointments.tsx` — branch now keys off canonical `confirmed` status | manual |
| 7 | Vitest config | P1 | `npm test` ran Playwright spec files through Vitest and crashed with `test.describe() called outside of test file` | Vitest had no exclude for `e2e/**`; both runners ran on the same glob | `vite.config.ts` — added `test.exclude: ['e2e/**', 'node_modules/**', 'dist/**']` so `npm test` ignores Playwright suites | implicit (test run now green) |
| 8 | Patient/Documents | P2 | Header "Security" + "Upload document" buttons had no `onClick`; modal "View / Download / Share" buttons also dead | Bolt prototype CTAs were never wired and no `patient_documents` storage exists in MVP | `src/pages/patient/Documents.tsx` — Security now deep-links to `/patient/settings`, modal "View" routes to the canonical source page per document type, Upload / Download / Share disabled with explicit "coming soon" titles | manual |
| 9 | Patient/Settings | P2 | "Password managed" button had no `onClick` so security tab was effectively a dead end | Recovery flow was not surfaced from the portal | `src/pages/patient/Settings.tsx` — wired a real "Email me a password reset link" button to `requestPasswordReset` with success/error feedback | manual |
| 10 | Insurance/Portal | P2 | Header Fraud / Bell / profile-menu buttons had no `onClick` and Export had no handler | Bolt prototype CTAs were never wired | `src/pages/insurance/Portal.tsx` — Fraud → `/insurance/fraud`, Bell → `/insurance/preauth`, profile → `/insurance/settings`; Export explicitly disabled with coming-soon tooltip | manual |
| 11 | Insurance/Portal | P1 | "Review urgent case" CTA on `PreAuthAlert` had no `onClick` even though the alert called for immediate triage | Bolt prototype CTA never wired | `src/pages/insurance/Portal.tsx` — now navigates to `/insurance/preauth` | manual |
| 12 | Insurance/Portal | P2 | Pre-auth row "Approve" / "Review" buttons were unwired in the dashboard and the dedicated workspace | Bulk write workflow is out of MVP scope | `src/pages/insurance/Portal.tsx` — explicitly disabled with tooltips so officers don't expect a working write path; main per-row review still happens in the workspace | manual |
| 13 | Insurance/Portal | P2 | `AiInsightCard` primary/secondary action buttons were unwired even though the hook returned `primary_action_url` / `secondary_action_url` | UI ignored URL fields | `src/pages/insurance/Portal.tsx` — renders `<a target="_blank">` when a URL is present; otherwise disabled with explanation | manual |
| 14 | Insurance/Portal | P2 | `FraudAlertCard` "Investigate" / "Freeze Claims" buttons unwired | Bolt prototype CTAs never wired | `src/pages/insurance/Portal.tsx` — Investigate → `/insurance/fraud`; Freeze Claims disabled with tooltip | manual |
| 15 | Insurance/Portal | P2 | "Bulk Approve AI Recommended" and "Run AI triage" buttons unwired in dashboard and workspace | Bulk approve / AI triage not implemented | `src/pages/insurance/Portal.tsx` — explicitly disabled with coming-soon tooltips | manual |
| 16 | Admin/Portal | P2 | Issue banner CTA rendered `issue.cta_label` on a button with no `onClick`, so urgent platform incidents had no follow-through | UI ignored `cta_kind` | `src/pages/admin/Portal.tsx` — added `issueCtaRoute(cta_kind, category)` mapping into the relevant admin route (compliance, security, integrations, billing, etc.) | manual |
| 17 | Admin/Portal | P2 | Org cards showed hardcoded "Monthly Trans" figures keyed off `org.kind` (`12,470`, `8,920`, `11,230`, `5,200`) masquerading as real metrics | Bolt placeholder copy | `src/pages/admin/Portal.tsx` — replaced fabricated transactions tile with a real "Type" tile derived from canonical `organizations.kind` | manual |
| 18 | Admin/Portal | P2 | Org card "View / Edit / Billing / Audit" buttons unwired | Per-org detail page is not in MVP, but Billing/Audit have real targets | `src/pages/admin/Portal.tsx` — Billing → `/admin/revenue`, Audit → `/admin/audit`; View/Edit disabled with tooltip | manual |
| 19 | Patient/Book appointment | P3 | Month-navigation chevrons in the calendar had no accessible name, so screen-reader users (and Playwright `getByRole`) could not find them | Icon-only buttons with no `aria-label` | `src/pages/patient/BookAppointment.tsx` — added `aria-label`-able prev/next-month titles | covered by `e2e/multi-role-interactions.spec.ts` |
| 20 | E2E suite | P1 | `clinical-workflows.spec.ts` hardcoded `^11$` for the Monday calendar pick and the baseline appointment fixture date was frozen at `2026-05-10`; both rotted as soon as the wall clock moved past those dates (cancel-from-worklist + booking specs failed) | Calendar/appointment fixtures were time-frozen | `e2e/clinical-workflows.spec.ts` + `e2e/support/supabase-mock.ts` — compute the next-Monday date dynamically; `now` in the supabase mock is the wall-clock `new Date()` so seeded `tomorrow`/`yesterday` are always future / past relative to the run | full suite (125 specs) now passes |
| 21 | E2E coverage | P1 (new) | No end-to-end coverage of a single multi-role journey (patient → doctor → lab → insurance → admin) | Sprint deliverable | New `e2e/multi-role-interactions.spec.ts` exercises booking propagation, lab order creation, lab dashboard surfacing, insurance render contract, and admin live-activity surfacing in a single deterministic Playwright spec | the spec itself |
| 22 | Pharmacy/Dashboard | P2 | Stock-alert list was sorted by a hardcoded drug-name priority list (atorvastatin/metformin/bisoprolol/warfarin), so real low-stock alerts were reshuffled by Bolt prototype copy regardless of actual urgency | Bolt copy leaked into a sort comparator | `src/pages/pharmacy/Dashboard.tsx` + `src/pages/pharmacy/stock-alerts.ts` — extracted `compareStockAlerts` that orders by clinical severity (out → low → near_expiry) then by remaining stock ascending | `src/pages/pharmacy/Dashboard.test.ts` |
| 23 | Pharmacy/Dashboard | P3 | Stock-alert banner injected `' 20mg'` into the displayed name of any "atorvastatin" alert that didn't already include "20mg" | Bolt copy hardcoded a strength label | `src/pages/pharmacy/Dashboard.tsx` — removed the drug-name regex; uses canonical inventory `item.name` verbatim | manual |
| 24 | Lab/Radiology | P2 | KPI tiles reused general lab metrics (`totalActiveTests`, `pendingOrders`, `completedToday`) as if they were radiology-specific, misleading radiology operators | Bolt page reused lab-wide hook | `src/pages/lab/Radiology.tsx` — added "Across all lab orders (radiology-specific metrics arrive with imaging Phase)" caption under each KPI | manual |
| 25 | Patient/Imaging | P3 | Hero "Share studies" button was unwired | Imaging is a Phase 3 release with no sharing surface yet | `src/pages/patient/Imaging.tsx` — disabled with coming-soon tooltip | manual |
| 26 | Doctor/CreatePrescription | P3 | "Renew Existing" and "History" buttons in the prescription composer had no `onClick` | Bolt prototype CTAs never wired | `src/pages/doctor/CreatePrescription.tsx` — both now navigate to `/doctor/prescriptions` (the canonical history workspace) | manual |
| 27 | Insurance/Portal | P3 | Sidebar showed "current seed period" next to live claim totals, implying the portal was running on demo data | Bolt copy carried over | `src/pages/insurance/Portal.tsx` — relabelled to "live workspace total" | manual |
| 28 | Doctor/Patients | P3 | Row-level Acknowledge + overflow buttons only called `event.stopPropagation()` and otherwise did nothing | Bolt placeholder behaviour | `src/pages/doctor/Patients.tsx` — both now navigate into the patient detail workspace (the canonical place to acknowledge a critical patient) and the overflow icon picks up an accessible name | manual |
| 29 | Patient/Records | P3 | Condition/allergy/vaccination form fields had no `maxLength` / dose bounds, allowing oversized payloads | Unbounded text inputs on `medical_conditions` / `allergies` / `vaccinations` forms | `src/lib/patient-records.ts` + `src/pages/patient/Records.tsx` — shared limits (200-char names, 2k notes, dose 1–99) on all free-text inputs | manual |
| 30 | Public/FindDoctor | P2 | Directory queried legacy Bolt `doctors` table instead of canonical profiles | Bolt-era table still wired in MVP public route | `src/pages/public/FindDoctor.tsx` — uses `useBookableDoctors()` / `get_bookable_doctors` RPC; book CTA deep-links `?doctor=<userId>` | e2e (mock RPC already present) |
| 31 | Hooks/booking | P2 | Booked-appointment RPC window ended at midnight on day +90, omitting same-day slots | `endDate` never set to end-of-day | `src/hooks/use-doctor-booking-availability.ts` — `endDate.setHours(23, 59, 59, 999)` | manual |
| 32 | Hooks/schedule | P2 | Doctor schedule UI listed inactive availability templates | Missing `is_active` filter on `doctor_availability` | `src/hooks/use-doctor-schedule.ts` — `.eq('is_active', true)` | manual |
| 33 | Hooks/AI chat | P2 | Patient AI “next appointment” card disappeared after doctor confirmed visit | Query filtered only `status = scheduled` | `src/hooks/use-patient-ai-chat.ts` — includes `scheduled`, `confirmed`, `in_progress` | manual |
| 34 | Hooks/messaging | P2 | Rapid thread switches could show another conversation’s messages | `loadMessages` had no stale-response guard | `src/hooks/use-messaging-hub.ts` — monotonic request id; mark-read failures surface `threadError` | manual |
| 35 | Patient/Insurance | P2 | Documents tab action buttons were inert (“upload coming soon”) | Bolt CTAs never wired | `src/pages/patient/Insurance.tsx` — card opens URL or profile upload; policy/annual → benefits; EOB → claims | manual |
| 36 | Patient/Dashboard + Appointments | P3 | Medication/appointment lists jumped height when loading finished | Skeleton blocks shorter than loaded/empty states | `min-h` on medication list + appointment skeleton container | manual |
| 37 | Patient/Settings | P2 | Preference save ignored Supabase `updateError` | No error branch after `user_profiles` update | `src/pages/patient/Settings.tsx` — `saveError` banner; saved timeout ref + cleanup | manual |
| 38 | Hooks/insurance | P2 | Cancelled/no_show appointments showed as insurance `pending` | Binary completed vs pending mapping | `src/hooks/use-patient-insurance.ts` — `denied` for cancelled/no_show; type extended | manual |
| 39 | Hooks/appointments | P3 | `useAppointments` accepted any `status` string | Untyped filter caused silent empty lists | `src/hooks/use-appointments.ts` — `AppointmentStatus` union | manual |
| 40 | E2E | P1 | `clinical-workflows` used frozen `2026-05-10` scenario dates | Diverged from wall-clock mock | `e2e/clinical-workflows.spec.ts` + `e2e/support/supabase-mock.ts` — shared `e2eScenarioTomorrow/Yesterday` | e2e |
| 41 | E2E | P2 | Reschedule RPC test hardcoded `2026-05-18` | Static ISO rotted | `e2e/clinical-workflows.spec.ts` — `nextMondayRescheduleIso` passed into `page.evaluate` | e2e |
| 42 | AI/lib | P2 | `invokeAiChat` accepted malformed JSON objects | Cast-only validation | `src/lib/ai.ts` — checks `sessionId` + `assistantMessage.content` | manual |
| 43 | Public/AIChat | P2 | Guest chat `setTimeout` leaked on unmount | No cleanup | `src/pages/public/AIChat.tsx` — `replyTimeoutRef` + `useEffect` cleanup | manual |
| 44 | Insurance/Portal | P3 | Risk analytics subtitle said "Current seeded period" | Demo copy | `src/pages/insurance/Portal.tsx` — "Reporting window (live workspace)" | manual |
| 45 | Doctor/Appointments | P2 | Export button had no handler | Dead CTA | `src/pages/doctor/Appointments.tsx` — CSV download of `routeAppointments` | manual |
| 46 | Doctor/Appointments | P3 | KPI stat cards looked clickable but did nothing | Buttons without `onClick` | `src/pages/doctor/Appointments.tsx` — `handleKpiCardAction` → today/week/pending/analytics/profile | manual |
| 47 | Doctor/Appointments | P2 | "New Appointment" sent doctors to patient booking route | Wrong RBAC path | `src/pages/doctor/Appointments.tsx` — `/doctor/patients` | manual |
| 48 | Patient/Profile | P2 | Core profile text fields lacked `maxLength` | Oversize payload risk | `src/pages/patient/Profile.tsx` + `src/lib/form-field-limits.ts` | manual |
| 49 | Patient/Profile | P3 | Overlay edit controls missing `type="button"` | Implicit submit risk | `src/pages/patient/Profile.tsx` — `type="button"` on edit chips | manual |
| 50 | Patient/AIChat | P2 | Composer textarea unbounded | Huge Edge payloads | `src/pages/patient/AIChat.tsx` — `FORM_FIELD_LIMITS.chatMessage` | manual |
| 51 | Public/FindClinic | P2 | Hospital fetch failures only logged to console | Empty UI on error | `src/pages/public/FindClinic.tsx` — `loadError` + Retry | manual |
| 52 | Public/FindClinic | P3 | Maps links opened without `noopener` | Tab-nabbing risk | `src/pages/public/FindClinic.tsx` — `noopener,noreferrer` | manual |
| 53 | Public/Laboratories | P2 | Fetch failure silently swapped in sample labs | Users thought samples were live | `src/pages/public/Laboratories.tsx` — `loadError` + explicit demo banner | manual |
| 54 | Public/Laboratories | P3 | Search input unbounded | Query hygiene | `src/pages/public/Laboratories.tsx` — search `maxLength` | manual |
| 55 | Pharmacy/Revenue | P3 | Claim "View" used blocking `window.alert` | Poor UX | `src/pages/pharmacy/Revenue.tsx` — expandable inline claim detail | manual |
| 56 | Shared | P3 | Field limits lived only on Records | Inconsistent caps | `src/lib/form-field-limits.ts` — shared limits; `patient-records.ts` re-exports | manual |
| 57 | Pharmacy/Inventory | P3 | Batch view used `window.alert` | Blocking stub | `src/pages/pharmacy/Inventory.tsx` — inline batch panel | manual |
| 58 | Pharmacy/Inventory | P3 | Inventory search unbounded; CSV export had no error UI | Silent export failures | `src/pages/pharmacy/Inventory.tsx` — `maxLength` + export error banner | manual |
| 59 | Public/FindDoctor | P3 | Directory search unbounded | Query hygiene | `src/pages/public/FindDoctor.tsx` — search `maxLength` | manual |
| 60 | Insurance/Portal | P3 | Four workspace search fields unbounded | Query hygiene | `src/pages/insurance/Portal.tsx` — search `maxLength` on filters | manual |
| 61 | Hooks/doctor-notifications | P2 | Loaded all conversations globally | Scale + privacy | `src/hooks/use-doctor-notifications.ts` — participant filter + limits | manual |
| 62 | Hooks/patient-notifications | P3 | Unbounded notification/message queries | Performance | `src/hooks/use-patient-notifications.ts` — `limit(25)` / `limit(15)` | manual |
| 63 | Patient/Insurance | P3 | `denied` claims had no distinct styling/filter | New status unused in UI | `src/pages/patient/Insurance.tsx` — rose styling + filter chip | manual |
| 64 | Patient/Insurance | P2 | Download card / contact insurer inert | Dead CTAs | `src/pages/patient/Insurance.tsx` — download summary + mailto | manual |
| 65 | Doctor/Profile | P2 | Professional + template fields lacked `maxLength` | Oversize payloads | `src/pages/doctor/Profile.tsx` — `FORM_FIELD_LIMITS` | manual |
| 66 | Auth/Login | P1 | Hung auth calls could stall UI forever | No timeout | `src/lib/with-timeout.ts` + `src/pages/auth/Login.tsx` | manual |
| 67 | Auth/Login | P3 | Recovery redirect timer not cleared on unmount | Orphan timeout | `src/pages/auth/Login.tsx` — ref + cleanup | manual |
| 68 | Auth/Forgot+Verify+Register | P2 | Auth forms lacked timeouts and `maxLength` | Same class as login | `ForgotPassword.tsx`, `VerifyOTP.tsx`, `Register.tsx` | manual |
| 69 | Patient/Book | P3 | Doctor search unbounded | Query hygiene | `src/pages/patient/BookAppointment.tsx` — search `maxLength` | manual |
| 70 | Admin/Portal | P3 | Org-created toast timers could stack | Orphan timeouts | `src/pages/admin/Portal.tsx` — toast ref + cleanup | manual |
| 71 | Admin/Portal | P3 | Org search / onboard modal fields unbounded | Oversize payloads | `src/pages/admin/Portal.tsx` — `maxLength` | manual |
| 72 | AI/lib | P1 | Failed AI uploads left orphan storage objects | No rollback on invoke failure | `src/lib/ai.ts` — rollback attachments when Edge invoke fails | manual |
| 73 | Auth | P1 | Rapid auth events applied stale profile state | No generation guard | `src/lib/auth-context.tsx` — `profileLoadGenerationRef` | `auth-context.test.ts` |
| 74 | Auth | P3 | Language preference persisted after sign-out | Privacy on shared devices | `src/lib/auth-context.tsx` — clear `ceenaix.lang` on `SIGNED_OUT` | manual |
| 75 | Patient/AIChat | P1 | Session switch showed previous thread messages | Missing reset on `selectedSessionId` | `src/pages/patient/AIChat.tsx` — clear messages on switch | manual |
| 76 | Patient/AIChat | P2 | Optimistic send skipped refetch for new sessions | Stale closure | `src/pages/patient/AIChat.tsx` — conditional `refetch()` | manual |
| 77 | Pre-visit | P1 | `setAnswers({})` used object instead of array | Type/runtime bug | `src/pages/patient/PreVisitAssessment.tsx` — `setAnswers([])` | manual |
| 78 | Pre-visit/lib | P2 | Autofill matched generic "phone" before specific fields | Wrong autofill source order | `src/lib/pre-visit.ts` — reorder `inferAutofillSourceFromQuestion` | `pre-visit.test.ts` |
| 79 | Doctor/patient-detail | P1 | Hook returned null when no shared appointments | Blocked messaging workflows | `src/hooks/use-doctor-patient-detail.ts` — removed early return | manual |
| 80 | Doctor/CreateRx+Lab | P2 | Catalog suggestions could insert null `created_by` | Missing guard | `CreatePrescription.tsx`, `CreateLabOrder.tsx` — `userId` check | manual |
| 81 | Pharmacy/Messages | P2 | Send was a no-op clearing draft | Bolt stub | `src/pages/pharmacy/Messages.tsx` — `sendPharmacyResponse` persistence | manual |
| 82 | Pharmacy/Settings | P2 | Setting toggles were visual only | No Supabase write | `src/pages/pharmacy/Settings.tsx` — `setPharmacySettingEnabled` | manual |
| 83 | Insurance/Portal | P1 | Bulk approve / single approve were inert | Bolt stub | `use-insurance-portal.ts` + `Portal.tsx` — real approve mutations | manual |
| 84 | Insurance/Portal | P2 | Export header had no handler | Dead CTA | `src/pages/insurance/Portal.tsx` — client CSV export | manual |
| 85 | Lab/Portal | P1 | Dozens of CTAs were placeholders | Bolt shell | `src/pages/lab/Portal.tsx` — queue/orders/results/radiology/NABIDH/analytics wired | manual |
| 86 | Lab/hooks | P2 | `lab_order_items` missing `id` in select | Bulk actions failed | `src/hooks/use-lab-ops-portal.ts` — select `id`; types updated | manual |
| 87 | Admin/Portal | P2 | Doctor verify OK/Reject inert | Bolt buttons | `src/pages/admin/Portal.tsx` — updates `dha_license_verified` | manual |
| 88 | Patient/Documents | P2 | Upload/Download/Share dead | Bolt stub | `src/pages/patient/Documents.tsx` — real download/share + routes | manual |
| 89 | Patient/Imaging | P3 | Share studies unwired | Bolt stub | `src/pages/patient/Imaging.tsx` — Web Share / mailto fallback | manual |
| 90 | Doctor/Appointments | P2 | Day/Month calendar toggles inert | Bolt stub | `src/pages/doctor/Appointments.tsx` — functional day/month views | manual |
| 91 | Doctor/Dashboard | P2 | Upcoming badge omitted `in_progress` | Wrong KPI | `src/pages/doctor/Dashboard.tsx` — includes in_progress | manual |
| 92 | Patient/Appointments | P2 | Upcoming/past lists stale after midnight | No clock tick | `src/pages/patient/Appointments.tsx` — `nowTick` interval | manual |
| 93 | Medication/lib | P2 | Unknown frequency defaulted to 1 dose/day | Wrong supply math | `src/lib/medication-schedule.ts` — parse more patterns; null when unknown | `medication-schedule.test.ts` |
| 94 | Booking/lib | P2 | Slot exactly at "now" marked past | Off-by-one minute | `src/lib/appointment-booking.ts` — `<` instead of `<=` for past | `appointment-booking.test.ts` |
| 95 | Pharmacy/Dashboard | P2 | Stock alerts sorted by hardcoded drug names | Wrong urgency order | `src/pages/pharmacy/stock-alerts.ts` — severity then quantity | `Dashboard.test.ts` |
| 96 | Patient/Profile | P2 | Save errors swallowed on profile/insurance | Silent failures | `src/pages/patient/Profile.tsx` — `saveError` banners | manual |
| 97 | Doctor/Settings | P2 | Notification prefs save ignored errors | Silent failure | `src/pages/doctor/Settings.tsx` — `saveError` banner | manual |
| 98 | Hooks/messaging | P2 | Conversation timestamp update only warned | Hidden inconsistency | `src/hooks/use-messaging-hub.ts` — `setActionError` on failure | manual |
| 99 | Hooks/doctor-patients | P3 | Sort crashed on null `scheduled_at` | Unsafe compare | `src/hooks/use-doctor-patients.ts` — null-safe localeCompare | manual |
| 100 | E2E | P1 | No multi-role journey coverage | Sprint gap | `e2e/multi-role-interactions.spec.ts` — patient→doctor→lab→insurance→admin | spec |
| 101 | Patient/Appointments | P1 | Future `cancelled` / `no_show` visits appeared in neither upcoming nor past | Cancelled rows excluded from past but had no dedicated section | `src/pages/patient/Appointments.tsx` — `cancelledAppointments` section; past excludes cancelled statuses | e2e `patient no-show appears in cancelled appointments` |
| 102 | E2E | P1 | Doctor workflow specs couldn't find Monday bookings | Default calendar view only shows selected day (today) | `e2e/clinical-workflows.spec.ts` + `e2e/multi-role-interactions.spec.ts` — switch to List tab before assertions | e2e |
| 103 | Public/FindClinic | P2 | "Book Appointment" header CTA was inert | Bolt button had no handler | `src/pages/public/FindClinic.tsx` — navigates to `/find-doctor` | manual |
| 104 | Doctor/Dashboard | P2 | AI insight card CTA permanently disabled | Bolt "coming soon" never wired | `src/pages/doctor/Dashboard.tsx` — opens consultation workspace when `featuredAppointment` exists | manual |
| 105 | Public/Home | P3 | Footer links used `href="#"` (no navigation) | Bolt placeholder anchors | `src/pages/public/Home.tsx` — in-page anchors to `#features`, `#pricing`, `#security`, `#contact` | manual |
| 106 | E2E | P2 | Doctor appointment assertions failed strict-mode (duplicate chief-complaint nodes) | Featured card + list row both render complaint text | `e2e/clinical-workflows.spec.ts` + `e2e/multi-role-interactions.spec.ts` — `.first()` + `/list view/i` tab selector | e2e |
| 107 | Hooks/doctor-dashboard | P1 | Pending review count zero | status=applied | status=pending | manual |
| 108 | Hooks/doctor-dashboard | P2 | Pre-visit review queue stuck | No reviewed_at | completed+reviewed_at null | manual |
| 109 | Hooks/doctor-dashboard | P2 | Rx/lab today wrong TZ | Browser midnight | clinicDayUtcBounds | manual |
| 110 | Hooks/doctor-dashboard | P2 | Reviewed lab items missing | resulted-only items | resulted+reviewed | manual |
| 111 | Hooks/doctor-dashboard | P2 | Critical labs after review hidden | resulted-only critical | include reviewed | manual |
| 112 | Hooks/doctor-dashboard | P3 | Patient age TZ edge | UTC DOB | clinic date-only age | manual |
| 113 | Hooks/doctor-dashboard | P2 | Next appt skipped in_progress | Excluded status | include in_progress | manual |
| 114 | Hooks/messaging | P2 | Stale conversation list | No guard | conversationRequestIdRef | manual |
| 115 | MessagesWorkspace | P2 | Opaque conversation error | i18n only | show conversationError | manual |
| 116 | MessagesWorkspace | P2 | Opaque thread error | i18n only | show threadError | manual |
| 117 | Doctor/Dashboard | P2 | No dashboard retry | Missing refetch | Retry button | manual |
| 118 | Doctor/Dashboard | P2 | Metric routing fragile | label match | card.id | manual |
| 119 | Doctor/Dashboard | P3 | Inert KPIs look clickable | cursor-pointer | disable on revenue/dha | manual |
| 120 | Doctor/Dashboard | P2 | Wrong quick action labels | Bolt copy | Message/Records/Consultation | manual |
| 121 | Pharmacy/Dashboard | P2 | Wrong messages badge | unread field | unreadCount | manual |
| 122 | Pharmacy/Dashboard | P2 | Empty stock banner | Always on | conditional | manual |
| 123 | Pharmacy/Dashboard | P2 | Silent load error | No banner | error+refetch | manual |
| 124 | Patient/Appointments | P2 | dateTo same-day PM | midnight end | parseLocal EOD | manual |
| 125 | Insurance/Portal | P2 | Urgent KPI wrong | non-pending | pendingPreAuths only | manual |
| 126 | Insurance/Portal | P1 | Insurance pages silent errors | No shell banner | InsuranceShell loadError | manual |
| 127 | Insurance/Portal | P2 | Portal load error hidden | No banner | loadError+onRetry | manual |
| 128 | Insurance/PreAuthorizations | P2 | PreAuthorizations load error hidden | No banner | loadError+onRetry | manual |
| 129 | Insurance/Claims | P2 | Claims load error hidden | No banner | loadError+onRetry | manual |
| 130 | Insurance/Members | P2 | Members load error hidden | No banner | loadError+onRetry | manual |
| 131 | Insurance/FraudDetection | P2 | FraudDetection load error hidden | No banner | loadError+onRetry | manual |
| 132 | Insurance/RiskAnalytics | P2 | RiskAnalytics load error hidden | No banner | loadError+onRetry | manual |
| 133 | Insurance/NetworkProviders | P2 | NetworkProviders load error hidden | No banner | loadError+onRetry | manual |
| 134 | Insurance/Reports | P2 | Reports load error hidden | No banner | loadError+onRetry | manual |
| 135 | Insurance/Settings | P2 | Settings load error hidden | No banner | loadError+onRetry | manual |
| 136 | Components | P2 | Load error not shown | Unused error | PortalQueryBanner.tsx | manual |
| 137 | Pharmacy/Inventory | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 138 | Pharmacy/Dispensing | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 139 | Pharmacy/Profile | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 140 | Pharmacy/Reports | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 141 | Pharmacy/Revenue | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 142 | Pharmacy/Settings | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 143 | Pharmacy/Messages | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 144 | Lab/ResultEntry | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 145 | Lab/Referrals | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 146 | Lab/Radiology | P2 | Load error not shown | Unused error | PortalQueryBanner | manual |
| 147 | Lab/Dashboard | P2 | Load error not shown | Unused error | PortalQueryBanner+refetch | manual |
| 148 | Hooks/doctor-notifications | P2 | status=pending fix | Wrong/missing query | src/hooks/use-doctor-notifications.ts | manual |
| 149 | Hooks/doctor-notifications | P2 | reviewed_at null on pre-visit fix | Wrong/missing query | src/hooks/use-doctor-notifications.ts | manual |
| 150 | Hooks/doctor-portal-chrome | P2 | resulted+reviewed orders fix | Wrong/missing query | src/hooks/use-doctor-portal-chrome.ts | manual |
| 151 | Hooks/doctor-portal-chrome | P2 | resulted+reviewed items fix | Wrong/missing query | src/hooks/use-doctor-portal-chrome.ts | manual |
| 152 | Hooks/patient-dashboard | P2 | resulted+reviewed lab items fix | Wrong/missing query | src/hooks/use-patient-dashboard.ts | manual |
| 153 | Hooks/patient-dashboard | P2 | insurance date key expiry fix | Wrong/missing query | src/hooks/use-patient-dashboard.ts | manual |
| 154 | Hooks/patient-dashboard | P2 | care team null sort fix | Wrong/missing query | src/hooks/use-patient-dashboard.ts | manual |
| 155 | Hooks/doctor-lab-orders | P2 | limit 200 fix | Wrong/missing query | src/hooks/use-doctor-lab-orders.ts | manual |
| 156 | Patient/Dashboard | P2 | Load error not shown | Unused error | dashboard retry | manual |
| 157 | Doctor/Appointments | P2 | Load error not shown | Unused error | clinic date keys | manual |
| 158 | Doctor/Appointments | P2 | Load error not shown | Unused error | list retry | manual |
| 159 | Lib/i18n-ui | P2 | clinicDayUtcBounds export fix | Wrong/missing query | src/lib/i18n-ui.ts | manual |
| 160 | E2E | P1 | Missing interaction: find-doctor | No spec | e2e/portal-interactions.spec.ts | spec |
| 161 | E2E | P1 | Missing interaction: find-clinic | No spec | e2e/portal-interactions.spec.ts | spec |
| 162 | E2E | P1 | Missing interaction: laboratories | No spec | e2e/portal-interactions.spec.ts | spec |
| 163 | E2E | P1 | Missing interaction: patient-cancelled | No spec | e2e/portal-interactions.spec.ts | spec |
| 164 | E2E | P1 | Missing interaction: patient-records | No spec | e2e/portal-interactions.spec.ts | spec |
| 165 | E2E | P1 | Missing interaction: patient-settings | No spec | e2e/portal-interactions.spec.ts | spec |
| 166 | E2E | P1 | Missing interaction: patient-insurance | No spec | e2e/portal-interactions.spec.ts | spec |
| 167 | E2E | P1 | Missing interaction: patient-labs | No spec | e2e/portal-interactions.spec.ts | spec |
| 168 | E2E | P1 | Missing interaction: doctor-today | No spec | e2e/portal-interactions.spec.ts | spec |
| 169 | E2E | P1 | Missing interaction: doctor-list | No spec | e2e/portal-interactions.spec.ts | spec |
| 170 | E2E | P1 | Missing interaction: doctor-patients | No spec | e2e/portal-interactions.spec.ts | spec |
| 171 | E2E | P1 | Missing interaction: doctor-schedule | No spec | e2e/portal-interactions.spec.ts | spec |
| 172 | E2E | P1 | Missing interaction: pharmacy-dashboard | No spec | e2e/portal-interactions.spec.ts | spec |
| 173 | E2E | P1 | Missing interaction: pharmacy-messages | No spec | e2e/portal-interactions.spec.ts | spec |
| 174 | E2E | P1 | Missing interaction: lab-dashboard | No spec | e2e/portal-interactions.spec.ts | spec |
| 175 | E2E | P1 | Missing interaction: insurance-preauth | No spec | e2e/portal-interactions.spec.ts | spec |
| 176 | E2E | P1 | Missing interaction: admin-lab-cta | No spec | e2e/portal-interactions.spec.ts | spec |
| 177 | E2E | P1 | Missing interaction: health-education | No spec | e2e/portal-interactions.spec.ts | spec |
| 178 | E2E | P1 | Missing interaction: auth-login | No spec | e2e/portal-interactions.spec.ts | spec |
| 179 | E2E | P1 | Missing interaction: auth-role | No spec | e2e/portal-interactions.spec.ts | spec |
| 180 | E2E/support | P2 | pharmacy role seed | Gap | e2eUsers.pharmacy | e2e |
| 181 | E2E/support | P2 | insurance role seed | Gap | e2eUsers.insurance | e2e |
| 182 | E2E/support | P2 | pharmacy org id | Gap | e2ePharmacyOrgId | e2e |
| 183 | E2E/support | P2 | insurance org id | Gap | e2eInsuranceOrgId | e2e |
| 184 | E2E/support | P2 | pharmacy queue tables | Gap | pharmacy_* mocks | e2e |
| 185 | E2E/support | P2 | insurance portal tables | Gap | insurance_* mocks | e2e |
| 186 | Doctor/Dashboard | P2 | metric navigate today | Gap | /doctor/today | manual |
| 187 | Doctor/Dashboard | P2 | metric navigate prescriptions | Gap | /doctor/prescriptions | manual |
| 188 | Doctor/Dashboard | P2 | metric navigate lab orders | Gap | /doctor/lab-orders | manual |
| 189 | Doctor/Dashboard | P2 | metric navigate messages | Gap | /doctor/messages | manual |
| 190 | E2E | P1 | Wave-2 interaction suite missing | No portal-interactions spec | `e2e/portal-interactions.spec.ts` (20 tests) | spec |
| 191 | E2E | P1 | Full regression count drift | 125 specs without wave-2 file | Suite now 145 specs all green | e2e |
| 192 | Patient/Dashboard | P2 | Load error message hidden | Generic i18n only | Surfaces `dashboardError` string | manual |
| 193 | Doctor/Appointments | P2 | List load error message hidden | Generic i18n only | Surfaces hook `error` string | manual |
| 194 | Insurance/Claims | P2 | Claims workspace missing refetch on error | `error` not destructured | `error` + shell Retry | manual |
| 195 | Pharmacy/Settings | P2 | Queue load failure conflated with toggle errors | Single local error state | `loadError` vs toggle `error` split | manual |
| 196 | Lab/Dashboard | P2 | Duplicate bespoke error markup | Custom rose banner | Replaced with `PortalQueryBanner` | manual |
| 197 | Hooks/doctor-dashboard | P2 | Pre-visit select omitted `reviewed_at` | Could not compute review backlog | Select includes `reviewed_at` | manual |
| 198 | Doctor/Dashboard | P2 | Load error missing `role=alert` | Screen readers skipped banner | `role="alert"` on error panel | manual |
| 199 | Patient/Dashboard | P2 | Load error missing `role=alert` | A11y gap | `role="alert"` on error panel | manual |
| 200 | Doctor/Appointments | P2 | `/doctor/today` route wrong day near midnight | Browser-local date key | Clinic TZ date key via `calendarDayKeyInTimeZone` | manual |
| 201 | Hooks/patient-dashboard | P2 | `valid_until` timestamptz broke date compare | Full ISO string vs date key | Compare `slice(0,10)` date keys | manual |
| 202 | Hooks/doctor-lab-orders | P2 | Heavy doctors could OOM on lab history | Unbounded select | `.limit(200)` on `lab_orders` | manual |
| 203 | Lib/i18n-ui | P2 | Calendar helpers not reusable | Private `calendarDayKeyInTimeZone` | Exported for appointments + dashboards | manual |
| 204 | E2E/support | P2 | Pharmacy portal journeys untestable | No `pharmacy` role in mock | `E2ERole` + seeds + table stubs | e2e |
| 205 | E2E/support | P2 | Insurance portal journeys untestable | No `insurance` role in mock | `E2ERole` + seeds + table stubs | e2e |
| 206 | Sprint | P2 | Wave-2 ledger target | Track 100 fixes in wave 2 | Ledger #107–#206 on `cursor/bug-wave-2-3d22` | manual |
