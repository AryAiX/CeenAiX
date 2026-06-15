# Dual-TX AI Scribing Setup

This note covers Doctor/Patient source assignment for the AI Consultation Recorder when using a two-transmitter receiver such as DJI Mic Mini.

## Hardware Setup

- Connect the DJI Mic Mini receiver to the laptop over USB-C.
- On macOS, select `Wireless Mic Rx` as the default input device.
- Clip TX1 to the doctor and TX2 to the patient.
- On the receiver, use stereo or split output mode when available. The browser must receive two separated input sources for deterministic labels.
- In the AI Scribe control bar, run the source setup:
  - Doctor voice / TX1 check: the doctor speaks using TX1, then the app assigns that setup check to Doctor.
  - Patient voice / TX2 check: the patient speaks using TX2, then the app assigns that setup check to Patient.
- If the receiver exposes true split stereo to the browser, advanced correction can map the hardware left/right sides manually.

## Browser Behavior

The recorder requests `channelCount: 2` and `sampleRate: 48000`, but the browser and device driver may still return mono. Device labels may be hidden until microphone permission is granted, so the UI does not depend on stable hardware labels.

When the active media track reports two channels and the setup checks show a clear split, the web app preserves the original recording and also records left/right mono files. The `consultation-scribe` Edge Function transcribes those files separately and merges the transcript with the configured Doctor/Patient labels.

When the active media track reports mono, duplicated stereo, or channel count is unavailable, the browser cannot see a hardware TX identity for each sample during simultaneous speech. The app keeps the existing single-file Whisper path and labels speakers from setup intent, diarization, and transcript context. Speaker labels remain editable in the transcript panel and should be reviewed before saving.

## Data Handling

No database schema change is required. The setup mode (`stereo_separated` or `voice_context`), source labels (Doctor = TX1, Patient = TX2), channel assignment, and detected channel count are sent as request/audit metadata. Split channel audio files are uploaded to the private `consultation-audio` bucket beside the main consultation recording and are used only when both left and right files are present.
