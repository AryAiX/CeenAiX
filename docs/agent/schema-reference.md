# Database Schema Quick Reference

> Condensed from `docs/specs/09-data-model.md`. All tables use UUID PKs, `created_at`/`updated_at` timestamps, and soft-delete (`is_deleted`/`deleted_at`) for clinical data.

## Phase 1 Tables (MVP)

### Identity & Profiles

```
auth.users (Supabase-managed)
  - id, email, phone, encrypted_password, raw_user_meta_data

user_profiles
  - id (PK), user_id (FK → auth.users, unique), role (enum: patient/doctor/nurse/pharmacy/lab/facility_admin/super_admin)
  - full_name, first_name, last_name, date_of_birth, gender, emirates_id (encrypted)
  - phone, email, address, city, avatar_url
  - notification_preferences (JSONB), profile_completed (bool), terms_accepted (bool)
  - RLS: users read their own row; role-specific counterparty policies are relationship/tenant scoped
  - Pharmacy contact display uses `get_patient_prescription_pharmacy_contact(p_prescription_id)`
    and returns only `(user_id, full_name)` when the caller owns the linked prescription
  - Messaging display uses `get_conversation_counterparty_profiles(user_ids)` and returns only
    `(user_id, full_name)` for requested users sharing a conversation with the caller

patient_profiles
  - id (PK), user_id (FK → auth.users, unique)
  - blood_type, emergency_contact_name, emergency_contact_phone

doctor_profiles
  - id (PK), user_id (FK → auth.users, unique)
  - license_number, specialization (primary text summary), sub_specialization, years_of_experience
  - consultation_fee, bio, languages_spoken (JSONB)
  - dha_license_verified (bool), dha_verified_at

specializations
  - id (PK), slug (unique), name (unique), category, sort_order, is_active

doctor_specializations
  - id (PK), doctor_user_id (FK → auth.users), specialization_id (FK → specializations)
  - unique (doctor_user_id, specialization_id)
```

Operational tenant checks use `is_current_user_ops_org(organization_id, kind)`.
Access requires active `organization_members` membership (or `super_admin`);
an application role alone never grants access to another organization.

### Clinical

```
appointments
  - id (PK), patient_id (FK → auth.users), doctor_id (FK → auth.users), facility_id (FK → facilities, nullable)
  - type (enum: in_person/virtual), status (enum: scheduled/confirmed/in_progress/completed/cancelled/no_show)
  - scheduled_at (timestamptz), duration_minutes, chief_complaint, notes

consultation_notes
  - id (PK), appointment_id (FK), doctor_id (FK → auth.users)
  - subjective, objective, assessment, plan (text — SOAP)
  - ai_generated_draft (text), doctor_approved (bool)

prescriptions
  - id (PK), patient_id (FK), doctor_id (FK), appointment_id (FK)
  - status (enum: active/completed/cancelled), prescribed_at

prescription_items
  - id (PK), prescription_id (FK)
  - medication_name (canonical / Latin INN), optional medication_name_ar (Arabic display — UI shows both when locale is non-English)
  - dosage, frequency, duration, quantity, instructions
  - frequency_code, duration_code (optional text — match `prescription_clinical_vocab.code` by category)
  - is_dispensed (bool)

prescription_clinical_vocab
  - id (PK), category (`frequency` | `duration`), code (unique per category)
  - label_en, label_ar, sort_order, is_active
  - legacy_match (optional — normalize legacy free-text rows; unique per category when set)
  - RLS: read active rows for `anon` + `authenticated`; full CRUD for `super_admin`

lab_orders
  - id (PK), patient_id (FK), doctor_id (FK), appointment_id (FK)
  - status (enum: ordered/collected/processing/resulted/reviewed), ordered_at

lab_order_items
  - id (PK), lab_order_id (FK)
  - test_name, test_code, status, result_value, result_unit, reference_range
  - is_abnormal (bool), resulted_at

patient_vitals
  - id (PK), patient_id (FK → auth.users), appointment_id (FK → appointments, nullable), recorded_by (FK → auth.users, nullable)
  - recorded_at, systolic_bp, diastolic_bp, heart_rate, temperature_c, spo2_percent, weight_kg, height_cm, bmi
  - source (text: manual/device/imported), notes
```

### Medical Records

```
medical_conditions
  - id (PK), patient_id (FK → auth.users)
  - condition_name, icd_code, diagnosed_date, status (enum: active/resolved/chronic), notes

allergies
  - id (PK), patient_id (FK → auth.users)
  - allergen, severity (enum: mild/moderate/severe), reaction, confirmed_by_doctor (bool)

vaccinations
  - id (PK), patient_id (FK → auth.users)
  - vaccine_name, dose_number, administered_date, administered_by, next_dose_due
```

### Messaging

```
conversations
  - id (PK), created_by (FK → auth.users), participant_ids (JSONB), subject, last_message_at

messages
  - id (PK), conversation_id (FK), sender_id (FK → auth.users)
  - body (text), sent_at, read_at
```

### Notifications

```
notifications
  - id (PK), user_id (FK → auth.users)
  - type (enum: appointment/medication/lab_result/system/alert)
  - title, body, is_read (bool), action_url, created_at
```

### AI

```
ai_chat_sessions
  - id (PK), user_id (FK → auth.users, nullable for guests)
  - session_token (unique), started_at, ended_at
  - context_patient_id (FK, nullable — for family member acting on behalf)

ai_chat_messages
  - id (PK), session_id (FK → ai_chat_sessions)
  - role (enum: user/assistant/system), content (text), attachments (JSONB), created_at

patient_memory_facts
  - id (PK), patient_id (FK → auth.users)
  - source_kind (enum: pre_visit_answer/ai_chat_message), source_record_id
  - memory_key, label, value_type (enum: text/text_list/boolean/number/date/json)
  - value_text, value_json (JSONB), status (enum: suggested/confirmed), confidence
  - usable_in_chat, usable_in_forms, confirmed_at, last_used_at, metadata (JSONB)

patient_canonical_update_requests
  - id (PK), patient_id (FK → auth.users)
  - source_kind (enum: pre_visit_assessment/ai_chat_message), source_record_id
  - target_field, display_label, apply_strategy
  - current_value (JSONB), proposed_value (JSONB)
  - status (enum: pending/applied/dismissed), requires_doctor_review, metadata (JSONB)
  - confirmed_at, applied_at, dismissed_at

patient_reported_medications
  - id (PK), patient_id (FK → auth.users), source_update_request_id (FK → patient_canonical_update_requests, nullable)
  - medication_name, dosage, frequency, duration, instructions
  - review_status (enum: pending_review/reviewed), is_current, is_deleted, deleted_at
```

### Pre-Visit Intake

```
pre_visit_templates
  - id (PK), doctor_user_id (FK → auth.users), specialization_id (FK → specializations, nullable)
  - title, description, status (enum: draft/published/archived), is_active
  - source_bucket, source_path, source_file_name, extraction_metadata (JSONB)
  - published_at

pre_visit_template_questions
  - id (PK), template_id (FK → pre_visit_templates)
  - question_key, label, help_text, question_type (enum: short_text/long_text/single_select/multi_select/boolean/number/date)
  - display_order, is_required, options (JSONB), autofill_source, memory_key, ai_instructions

appointment_pre_visit_assessments
  - id (PK), appointment_id (FK → appointments, unique), patient_id (FK → auth.users), doctor_id (FK → auth.users)
  - template_id (FK → pre_visit_templates, nullable), template_title, template_snapshot (JSONB)
  - status (enum: not_started/in_progress/completed/reviewed)
  - due_at, started_at, completed_at, reviewed_at, last_answered_at

appointment_pre_visit_answers
  - id (PK), assessment_id (FK → appointment_pre_visit_assessments)
  - question_key, question_label, question_type
  - answer_text, answer_json (JSONB), autofill_value (JSONB), autofill_source
  - autofilled, confirmed_by_patient, answered_at

appointment_pre_visit_summaries
  - id (PK), assessment_id (FK → appointment_pre_visit_assessments, unique)
  - appointment_id (FK → appointments), patient_id (FK → auth.users), doctor_id (FK → auth.users)
  - summary_text, key_points (JSONB), risk_flags (JSONB), pending_questions (JSONB)
  - generated_by, generated_at
```

### AI Consultation Recording (Phase 2 — implemented)

> Doctor Portal AI Scribe. Audio is captured in the Consultation Workspace, transcribed (Whisper), and turned into a reviewable SOAP note (GPT-4o) via the `consultation-scribe` Edge Function. Consent and every recording event are logged immutably. Audio lives in the private `consultation-audio` Storage bucket (signed URLs only).

```
consultation_recordings
  - id (PK), appointment_id (FK), doctor_id (FK), patient_id (FK), clinic_id (nullable, mirrors appointments.facility_id)
  - audio_storage_path, audio_mime_type, duration_seconds, language_detected
  - status (enum: recording/processing/ready/approved/discarded)
  - started_at, ended_at, is_deleted, deleted_at

consultation_transcripts
  - id (PK), recording_id (FK), full_text
  - segments (JSONB array of {speaker, start_ms, end_ms, text, confidence}), language, model_used

ai_clinical_notes
  - id (PK), recording_id (FK), appointment_id (FK), doctor_id (FK), patient_id (FK)
  - chief_complaint, soap_subjective, soap_objective, soap_assessment, soap_plan
  - symptoms/medications/diagnoses/follow_up/education_points (JSONB)
  - output_language, model_used, prompt_template, custom_instructions
  - generated_at, approved_by, approved_at, is_deleted, deleted_at

consultation_consent_log  (append-only)
  - id (PK), appointment_id (FK), recording_id (FK, nullable), doctor_id, patient_id
  - consent_method (enum: verbal/signed), informed_patient, verbal_consent, signature_image_url, consented_at

consultation_recordings_audit  (append-only)
  - id (PK), recording_id (FK, nullable), appointment_id (FK, nullable), actor_id
  - action (started/stopped/discarded/transcribed/note_generated/note_approved/...), metadata (JSONB), ip_address, occurred_at
```

RLS: treating doctor manages rows where `doctor_id = auth.uid()`; patient can read their own; `super_admin` can read. Consent + audit tables are insert/select only. Storage objects are namespaced `{doctor_id}/{appointment_id}/{file}` with matching policies.

## Canonical Record Update Notes

- Canonical demographic/profile updates are staged in `patient_canonical_update_requests` first, then applied only after patient confirmation.
- `medical_conditions` and `allergies` keep historical visibility by soft-deleting superseded current rows rather than hard deleting them.
- Medication changes from patient forms/chat do **not** overwrite doctor-issued `prescriptions`; they create/update `patient_reported_medications` for doctor review and future patient autofill/chat context.
- Doctors can read `patient_canonical_update_requests` and `patient_reported_medications` through the same appointment-linked RLS pattern used by other patient data.

### Content

```
health_articles
  - id (PK), title, slug (unique), body, category, author_name
  - cover_image_url, is_published (bool), published_at
```

### Insurance (read-only for patients in MVP)

```
insurance_plans
  - id (PK), name, provider_company, coverage_type, annual_limit
  - co_pay_percentage, network_type, is_active (bool)

patient_insurance
  - id (PK), patient_id (FK), insurance_plan_id (FK)
  - policy_number, member_id, card_photo_url, valid_from, valid_until, is_primary (bool), annual_limit_used
```

### Scheduling

```
doctor_availability
  - id (PK), doctor_id (FK → auth.users), facility_id (FK, nullable)
  - day_of_week (int 0-6), start_time (time), end_time (time), slot_duration_minutes, is_active (bool)

blocked_slots
  - id (PK), doctor_id (FK), blocked_date, start_time, end_time, reason
```

### Admin

```
audit_logs
  - id (PK), user_id (FK), action (enum: create/update/delete/access)
  - table_name, record_id, old_value (JSONB), new_value (JSONB), ip_address, created_at

platform_settings
  - id (PK), key (unique), value (JSONB), updated_by (FK), updated_at
```

---

## Phase 2+ Tables (DO NOT create in MVP)

```
family_links              — Phase 2 (family management)
consultation_sessions     — Phase 2 (virtual consultation + transcription)
ai_clinical_suggestions   — Phase 2 (real-time AI diagnosis)
payments                  — Phase 2 (Stripe)
referrals                 — Phase 2 (doctor-to-doctor)
medication_reminders      — Phase 2 (push notifications)
nurse_profiles            — Phase 3
pharmacy_profiles         — Phase 3
lab_profiles              — Phase 3
facilities                — Phase 3
facility_staff            — Phase 3
dispensing_records        — Phase 3
lab_result_files          — Phase 3
imaging_records           — Phase 3
insurance_claims          — Phase 3
```

---

## Bolt Code Compatibility

> The Bolt-generated UI queries ad-hoc tables that do not match the spec schema. When building the real database, use the spec tables above. This section maps Bolt's table names so agents understand what the existing code expects.

| Bolt Table Name | Spec Equivalent | Bolt Columns (key differences) |
|---|---|---|
| `doctors` | `user_profiles` JOIN `doctor_profiles` | Flat: `id`, `name`, `specialty`, `location`, `image_url`, `rating`, `accepts_video` |
| `hospitals` | `facilities` (Phase 3) | `id`, `name`, `type`, `address`, `city`, `rating`, `specialties` |
| `hospital_doctors` | `facility_staff` (Phase 3) | Junction table linking hospitals to doctors |
| `laboratories` | `lab_profiles` (Phase 3) | `id`, `name`, `location`, `rating`, `tests_available` |
| `profiles` | `user_profiles` | `id`, `full_name`, `email`, `phone`, `role`, `specialization`, `license_number` |
| `doctor_ratings` | **Not in spec** | `id`, `doctor_id`, `user_id`, `rating`, `comment` |
| `appointments` | `appointments` (same name, different columns) | Uses `doctor_name`, `appointment_date`/`appointment_time` (strings), `location`, `reason` instead of spec's `scheduled_at`, `facility_id`, `chief_complaint` |
| `prescriptions` | `prescriptions` + `prescription_items` | Flat: medication fields directly on the row instead of normalized items |

**When creating migrations**: use the spec column definitions above. Existing Bolt component queries will need updating to match. See `docs/agent/bolt-code-audit.md` for the full migration guide.

**Suggested approach for `doctors` table**: create a Postgres VIEW `doctors_view` that joins `user_profiles` + `doctor_profiles` so existing queries need minimal refactoring.

---

## RLS Pattern

Every table with patient data uses this RLS pattern:

```sql
-- Patients see their own data
CREATE POLICY "patients_own_data" ON table_name
  FOR ALL USING (auth.uid() = patient_id);

-- Doctors see data for patients they have appointments with
CREATE POLICY "doctors_via_appointment" ON table_name
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.doctor_id = auth.uid()
        AND appointments.patient_id = table_name.patient_id
    )
  );
```
