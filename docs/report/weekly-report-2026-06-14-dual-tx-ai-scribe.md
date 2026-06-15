# Weekly Report — Dual-Transmitter AI Scribe Setup & Voice-Reference Labeling

Date: 2026-06-14  
Project: CeenAiX  
Scope: Dual-transmitter AI scribing setup, mixed-input voice-reference labeling, recording metadata, AI Scribe UX/test iteration, and auth stability fixes  
Branches: `ai-scribe-dual-tx` (`ec7d54a`, `ed7f7b2`, `7a4e9e0`) plus uncommitted follow-up changes on the same branch  
Prior week: [Weekly Report — Azure UAE Public-IP Pilot & Mobile Patient App Foundation (2026-06-07)](weekly-report-2026-06-07-azure-uae-mobile-patient.md)

## Executive Summary

| Metric | This week | Prior week (2026-06-07) |
|--------|-----------|--------------------------|
| **Headline achievement** | **Dual-transmitter AI Scribe setup configured and validated** | Azure UAE public-IP pilot and React Native patient app foundation |
| **AI Scribe capture path** | DJI / dual TX receiver selected as `Wireless Mic Rx`; app checks Doctor/TX1 and Patient/TX2 before recording | AI Recorder existed with planned dual-mic channel split |
| **Source separation status** | True stereo is used automatically when visible to the browser; mixed/duplicated browser input falls back to voice-reference + conversation-context labeling | Deterministic speaker split was planned but not configured |
| **UX direction** | Source/voice setup, no consent modal in start path, no manual channel-assignment prompts | Consent modal + single-mic/live diarization limitations |
| **Backend support** | Recording metadata, channel-audio paths, speaker-reference paths, TX labels, and source-assignment audit metadata | Recording tables, transcript/note generation, live chunks |
| **Test surface** | AI Scribe E2E expanded; `RecordingControlBar` unit coverage added; consultation-scribe metadata tests updated | Mobile and release validation |

This week focused on making the **dual-transmitter AI Scribe workflow usable in the real consultation room**. The receiver was configured as `Wireless Mic Rx`, TX1 was assigned to the doctor, and TX2 was assigned to the patient. Outside-app audio capture checks confirmed both transmitters can be captured individually, but the current receiver/browser path may still present the signal as duplicated or mixed input rather than true split stereo.

The product direction changed accordingly: the app no longer asks the doctor to manually assign channels up front. It now runs a **source/voice setup**: Doctor/TX1 speaks, Patient/TX2 speaks, and the recorder decides whether the browser exposes a reliable stereo split. If it does, the scribe uses separate left/right channel audio. If it does not, the setup samples become voice-reference context for the `consultation-scribe` function so Doctor and Patient labels can be inferred from setup intent plus conversation content.

## Dual-Transmitter Setup

The hardware path is now documented and represented in the Doctor Portal setup flow.

- Connect the DJI / dual TX receiver over USB-C and select `Wireless Mic Rx` as the macOS/browser input.
- Clip **TX1** to the doctor and **TX2** to the patient.
- Run the AI Scribe source setup before recording.
- The doctor completes the Doctor voice / TX1 check.
- The patient completes the Patient voice / TX2 check.
- The app uses true stereo automatically when the browser exposes separated left/right input.
- When the browser exposes mono, duplicated stereo, or unclear separation, the app continues with voice-context labeling rather than blocking the consultation.

This is an important practical adjustment. The ideal architecture remains deterministic channel split, but the current browser/device behavior cannot be assumed to expose separate hardware identities during simultaneous speech. The workflow now acknowledges that reality without falling back to a confusing manual assignment step.

## AI Scribe UX Iteration

The setup path was heavily simplified around what the doctor needs to do in the room.

- The old channel-first setup language was replaced with source/voice language: **Doctor/TX1 check** and **Patient/TX2 check**.
- The setup UI opens directly from **Start source setup** and no longer shows the consent modal in the setup/start path.
- Backend compatibility is preserved by sending an internal verbal-consent payload when creating the recording, so existing consent persistence contracts are not broken.
- The setup confirmation explains either automatic stereo labeling or voice-reference/context labeling.
- Manual channel assignment, correction, review, and advanced diagnostics prompts were removed from the primary start path.
- EN/AR copy was updated for the new source setup language.

The result is a cleaner clinical workflow: check the two voices, start the conversation, and let the scribe use the best available signal path.

## Voice-Reference Processing

The largest functional change after the initial dual-channel commit is support for voice-reference enrollment when true source separation is unavailable.

- The setup records short Doctor/TX1 and Patient/TX2 audio samples.
- Reference samples are uploaded under `speaker-references/` in the private `consultation-audio` bucket.
- Recording metadata stores `scribeInputMode`, source labels, speaker-reference paths, detected channel count, and whether stereo separation was applied.
- The `consultation-scribe` function transcribes the main consultation audio as usual.
- When complete speaker-reference paths are attached, the function transcribes the setup samples and uses GPT-4o labeling guidance to relabel transcript segments from reference text plus conversation context.
- The function explicitly avoids claiming biometric voice matching or hardware separation when the browser provided mixed audio.

When true stereo is available, the existing split path remains: left/right mono files are uploaded, transcribed separately, and merged with the configured Doctor/Patient mapping. When stereo is not available, the voice-reference path improves labeling context without pretending the browser can see TX identity inside a combined signal.

## Supporting Auth / Platform Work

Several stability fixes landed alongside the AI Scribe work.

- `user_profiles` recursive RLS policy repair was added so auth role resolution does not fail with Postgres recursive policy errors.
- Recording metadata was added to `consultation_recordings` as a JSONB column with a GIN index for setup/reference metadata.
- Auth sign-out now clears stale Supabase auth storage and app session artifacts more aggressively.
- Login role-switch messaging was clarified.
- Onboarding behavior was tightened so non-portal roles do not loop indefinitely and the onboarding skip path does not bounce users back into the same page.

These are secondary to the dual-TX work, but they matter because AI Scribe setup sits inside the authenticated doctor appointment workspace.

## CI / Platform Delivery

| Change | Evidence | Detail |
|--------|----------|--------|
| Dual-channel AI Scribe support | `ec7d54a` | Channel detection, split-channel recording/upload, live channel source labels, Edge Function split transcription |
| Source/voice setup iteration | Working tree | Doctor/TX1 and Patient/TX2 checks, no manual assignment prompt, mixed-input UX fallback |
| Voice-reference labeling | Working tree | Speaker-reference capture/upload, scribe metadata, Edge Function reference transcription + context labeling |
| Consent path simplification | Working tree | Consent modal removed from setup/start; internal verbal consent keeps recording creation compatible |
| Recording metadata migration | `20260614190000_add_consultation_recording_metadata.sql` | `consultation_recordings.metadata` JSONB + GIN index |
| Auth RLS repair | `20260614173500_fix_user_profiles_recursive_auth_policies.sql` | Non-recursive self-read policy + `is_current_user_super_admin()` helper |
| Auth session cleanup | `7a4e9e0` | Clear stale auth storage on sign out |
| Login role messaging | `ed7f7b2` | Clearer role-switch banner in login flow |

## Verification

```text
Hardware / browser validation
confirmed — DJI / dual TX receiver can be selected as Wireless Mic Rx
confirmed — TX1 and TX2 can be captured individually outside the app
observed — current receiver/browser path may duplicate or mix the signal rather than expose split stereo

App behavior represented in code/tests
covered — source setup opens without consent modal
covered — Doctor/TX1 and Patient/TX2 checks run before recording
covered — confident stereo checks select stereo_separated mode
covered — mixed input continues with voice_context mode
covered — setup avoids manual assignment/review prompts in the primary flow
covered — speaker-reference paths are sent to consultation-scribe and stored in recording metadata

Repository evidence reviewed for this report
reviewed — latest weekly report format under docs/report
reviewed — git log for 2026-06-08 through 2026-06-14
reviewed — current git status/diff summary for AI Scribe and auth files
```

## Residual Notes

- **True split stereo still depends on the browser/device path.** The app requests two channels and uses split-channel audio when exposed, but the current receiver/browser combination may still deliver duplicated or mixed audio.
- **Voice-reference labeling is contextual, not biometric.** It uses setup reference transcripts and conversation content to label segments; it should not be described as provider-level voiceprint matching.
- **Transcript review remains clinically important.** The start path no longer asks for manual channel assignment, but AI-generated transcript and SOAP output should still be reviewed before saving to the record.
- **Full test suite was not rerun for this report.** The report is based on branch evidence, changed tests, migrations, and source review; only light report validation was requested.
