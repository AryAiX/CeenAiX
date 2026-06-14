# AI Features Reference

> How AI is used in CeenAiX. All AI calls go through Supabase Edge Functions.

## MVP AI Features

### 1. Conversational Health Chat

- **Who**: Guest (no auth) and Patient (with context)
- **Model**: GPT-4o via Edge Function `ai-chat`
- **Input**: User message + conversation history + patient context (if authenticated)
- **Output**: Streaming response via SSE
- **Storage**: `ai_chat_sessions` + `ai_chat_messages`
- **Guest behavior**: Session-scoped, no persistent history, prompts registration on booking
- **Patient behavior**: Full conversation history, patient records injected as context (conditions, allergies, medications), plus reusable patient-memory facts derived from confirmed forms and lower-trust prior chat disclosures
- **Canonical record review**: Authenticated chat now stages patient-provided canonical updates (for example address, phone, conditions, allergies, or medications) into a pending review queue before anything updates the reusable record layer

### 2. Document & Photo Analysis

- **Who**: Guest and Patient
- **Model**: GPT-4o Vision via Edge Function `ai-document-analyze`
- **Input**: Photo/document upload (insurance card, lab result, prescription, Emirates ID)
- **Output**: Extracted structured data (JSON) + plain-language explanation
- **Use cases**:
  - Insurance card → `{ provider, policy_number, member_id }` → auto-fill `patient_insurance`
  - Lab result photo → `{ test_name, value, unit, reference_range }` → display with interpretation
  - Emirates ID → `{ name, id_number, dob, nationality }` → auto-fill `user_profiles`

### 3. Symptom Assessment

- **Who**: Guest and Patient
- **Part of**: Conversational chat with structured prompting
- **Behavior**: AI conducts symptom interview, suggests possible conditions, recommends specialist type
- **Output**: Structured assessment stored in chat; used for doctor matching

### 4. Lab Result Interpretation

- **Who**: Patient (viewing doctor-uploaded results)
- **Model**: GPT-4o via Edge Function
- **Input**: Lab result values + patient history (conditions, medications)
- **Output**: Plain-language explanation displayed above raw values

### 5. Pre-Visit Assessment

- **Who**: Patient (before appointment)
- **Behavior**: AI conducts structured questionnaire based on appointment specialty and chief complaint
- **Output**: Structured summary stored in `ai_chat_messages`; shared with doctor via appointment record
- **Memory reuse**: Repeated non-canonical questions can map to stable `memory_key` values so future forms and authenticated chat can reuse patient-confirmed answers without writing them directly into canonical medical tables
- **Canonical confirmation**: If a confirmed form answer differs from editable canonical record fields, the patient sees a review-before-submit step; demographics/profile values update directly after confirmation, clinical lists preserve history, and medication changes go into doctor-reviewable patient-reported medication history

## Edge Function Patterns

```typescript
// ai-chat Edge Function skeleton
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const { message, session_id } = await req.json()
  const supabase = createClient(/* env vars */)
  
  // 1. Verify auth (or create guest session)
  // 2. Load conversation history from ai_chat_messages
  // 3. If authenticated, load patient context (conditions, allergies, medications)
  // 4. Build messages array for OpenAI
  // 5. Call OpenAI with streaming
  // 6. Stream response back via SSE
  // 7. Store assistant message in ai_chat_messages
})
```

## Phase 2+ AI Features (DO NOT implement in MVP)

- Live consultation transcription (Whisper) — Phase 2
- Real-time diagnosis suggestions — Phase 2
- SOAP note auto-generation — Phase 2
- Medication interaction checking during prescribing — Phase 2
- Preventive care risk profiling — Phase 3
- Wellness coaching — Phase 3
- Semantic search over medical records — Phase 2

### Consultation Scribe Dual-TX Channel Assignment

The AI Consultation Recorder supports a local dual-TX setup for deterministic speaker labels when the browser receives stereo input. Doctors choose whether Left / Channel 1 or Right / Channel 2 is Doctor vs Patient; the preference is stored locally and sent to the `consultation-scribe` Edge Function with recorded and live requests.

If stereo is detected, the browser records the original stream plus left/right mono channel files, and the Edge Function transcribes channel files separately before merging segments with fixed Doctor/Patient labels. If mono is reported, the flow falls back to the existing best-effort speaker labeling.

See `docs/ai/dual-tx-scribing.md` for DJI Mic Mini setup and manual test steps.
