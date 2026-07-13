# Routes Quick Reference

> MVP routes only. Full route map in `docs/specs/14-route-map.md`.
> For Bolt code conflicts, see `docs/agent/bolt-code-audit.md`.

## Code Status Legend

- **live** — Route exists in code and queries Supabase
- **ui-only** — Route exists in code but uses static/mock data
- **not-started** — Route is in the MVP spec but has no code yet
- **bolt-extra** — Route exists in Bolt code but is NOT in MVP spec (defer or remove)

## Public (no auth)

| Route | Component | Code Status | Notes |
|---|---|---|---|
| `/` | Home | ui-only | Static landing page |
| `/ai-chat` | AIChat | ui-only | Local rule-based responses; needs Edge Function replacement |
| `/find-doctor` | FindDoctor | live | Queries Bolt `doctors` table (needs migration to `doctor_profiles` + `user_profiles`) |
| `/find-clinic` | FindClinic | live | Queries Bolt `hospitals` table (Phase 3 per spec; hardcode for MVP) |
| `/insurance` | Insurance | ui-only | Static plans; needs wiring to `insurance_plans` |
| `/health-education` | HealthEducation | ui-only | Static articles; needs wiring to `health_articles` |
| `/pharmacy` | Pharmacy | bolt-extra | Not in MVP spec; remove from MVP router |
| `/laboratories` | Laboratories | bolt-extra | Phase 3 per spec; remove from MVP router |
| `/appointment-showcase` | AppointmentDesignShowcase | bolt-extra | Design demo; remove before production |
| `/about` | — | not-started | |

## Auth

| Route | Component | Code Status | Notes |
|---|---|---|---|
| `/auth/login` | Login | not-started | Email/password + OTP; redirect by role |
| `/auth/register` | Register | not-started | Multi-step wizard |
| `/auth/forgot-password` | ForgotPassword | not-started | Email reset link |
| `/auth/verify-otp` | VerifyOTP | not-started | Shared OTP screen |
| `/auth/onboarding` | Onboarding | not-started | Role-adaptive; skippable |

## Patient (auth required, role=patient)

| Route | Component | Code Status | Key Data |
|---|---|---|---|
| `/patient/dashboard` | PatientDashboard | live | appointments, prescriptions, prescription_items, conversations, messages, notifications |
| `/patient/ai-chat` | PatientAIChat | live | Reads/stores `ai_chat_sessions` + `ai_chat_messages`, calls the deployed `ai-chat` Edge Function, surfaces ranked history evidence + action metadata, persists chat attachments, supports chat starter actions including resume into incomplete pre-visit intake, and hands symptom-driven recommendations into `/patient/appointments/book`; GPT-backed responses are validated in the current environment and other environments must provide the same secret/config |
| `/patient/appointments` | PatientAppointments | live | Reads canonical `appointments` and doctor profile data from `user_profiles` + `doctor_profiles`; upcoming cards now surface pre-visit intake status and resume/review actions when an assessment exists |
| `/patient/appointments/book` | BookAppointment | live | Books against `doctor_availability`, `blocked_slots`, and existing `appointments`; when the doctor has an active pre-visit template, booking now redirects into the linked intake flow |
| `/patient/pre-visit/:assessmentId` | PatientPreVisitAssessment | live | Appointment-linked structured intake with autofill review, patient completion, and AI-generated doctor summary |
| `/patient/appointments/:id` | AppointmentDetail | not-started | Single appointment + consultation_notes |
| `/patient/records` | PatientRecords | live | Reads canonical `medical_conditions`, `allergies`, and `vaccinations`; supports patient-side record entry/removal |
| `/patient/lab-results` | PatientLabResults | not-started | lab_orders + lab_order_items (patient_id = me) |
| `/patient/lab-results/:id` | LabResultDetail | not-started | Single lab order |
| `/patient/prescriptions` | PatientPrescriptions | live | Reads canonical `prescriptions` + `prescription_items` and joins prescribing doctor details from `user_profiles` + `doctor_profiles` |
| `/patient/messages` | PatientMessages | live | Secure inbox backed by canonical `conversations` + `messages`; supports patient compose entry from appointments and prescriptions |
| `/patient/messages/:id` | ConversationDetail | live | Route-driven conversation detail inside the same live messaging workspace |
| `/patient/notifications` | NotificationCenter | not-started | notifications (user_id = me) |
| `/patient/emergency-profile` | EmergencyProfile | not-started | patient_profiles emergency fields |
| `/patient/profile` | PatientProfile | ui-only | Local state only; needs wiring to user_profiles, patient_profiles, patient_insurance |

## Doctor (auth required, role=doctor)

| Route | Component | Code Status | Key Data |
|---|---|---|---|
| `/doctor/dashboard` | DoctorDashboard | live | Aggregates canonical `appointments`, `consultation_notes`, `appointment_pre_visit_assessments`, `conversations`, and `messages`; shows live totals, next appointment, and today's patient queue |
| `/doctor/patients` | DoctorPatients | live | Builds the linked patient list from canonical `appointments`, joining `user_profiles` + `patient_profiles` for contact and profile context; now links into the doctor patient detail workspace |
| `/doctor/patients/:id` | PatientDetail | live | Full doctor-side patient workspace combining identity, appointment history, chart data, prescriptions, lab orders, patient-reported medications, and canonical update history |
| `/doctor/appointments` | DoctorAppointments | live | Reads canonical `appointments`; surfaces patient-provided reason/notes plus appointment-linked pre-visit intake status and AI summary when available |
| `/doctor/appointments/:id` | DoctorAppointmentDetail | live | Appointment consultation workspace with status actions, pre-visit review, SOAP note capture, and handoffs into prescriptions, lab orders, and messaging |
| `/doctor/prescriptions` | DoctorPrescriptions | live | Reads canonical `prescriptions` + `prescription_items`, joining patient identity from `user_profiles`; supports doctor-side search and active/history filtering |
| `/doctor/prescriptions/new` | CreatePrescription | live | Creates canonical `prescriptions` + `prescription_items`, supports patient/appointment prefill, and issues a patient notification handoff |
| `/doctor/lab-orders` | DoctorLabOrders | live | Reads canonical `lab_orders` + `lab_order_items`, supports doctor-side search/filtering, and links each order back into patient communication |
| `/doctor/lab-orders/new` | CreateLabOrder | live | Creates canonical `lab_orders` + `lab_order_items` with patient/appointment prefill and patient-side notification handoff |
| `/doctor/schedule` | DoctorSchedule | live | doctor_availability, blocked_slots |
| `/doctor/messages` | DoctorMessages | live | Secure inbox backed by canonical `conversations` + `messages`; supports doctor compose entry from patients and prescriptions |
| `/doctor/messages/:id` | ConversationDetail | live | Route-driven conversation detail inside the same live messaging workspace |
| `/doctor/notifications` | NotificationCenter | live | Doctor notification center combining stored `notifications` rows with live derived attention items from unread patient messages, completed pre-visit intake, and patient chart updates requiring review |
| `/doctor/profile` | DoctorProfile | live | Queries `user_profiles` + `doctor_profiles`; also manages doctor pre-visit template authoring with PDF upload, AI draft extraction, question review, and publish |

## Admin (auth required, role=super_admin)

| Route | Component | Code Status |
|---|---|---|
| `/admin/dashboard` | AdminDashboard | not-started |
| `/admin/users` | UserManagement | not-started |
| `/admin/insurance` | InsuranceManagement | not-started |

## Laboratory (auth required, role=lab)

| Route | Component | Code Status | Key Data |
|---|---|---|---|
| `/lab/queue` | LabQueue | live | Renders the operational queue for the caller's single active lab membership; accounts without a membership fail closed and multi-lab accounts require a future explicit lab selector |
| `/lab/referrals` | LabReferrals | live | Legacy alias for the same queue workspace |

## System

| Route | Component | Code Status |
|---|---|---|
| `/404` | NotFound | not-started |
| `/500` | ServerError | not-started |
| `/maintenance` | Maintenance | not-started |
| `/access-denied` | AccessDenied | not-started |

## Route Guards

All `/patient/*` routes require `role === 'patient'`.
All `/doctor/*` routes require `role === 'doctor'`.
All `/admin/*` routes require `role === 'super_admin'`.
Unauthorized access redirects to `/access-denied`.
Unauthenticated access redirects to `/auth/login`.

> **Note**: Route guards are live in code. Unauthenticated users are redirected to `/auth/login`, and wrong-role access redirects to `/access-denied`.
