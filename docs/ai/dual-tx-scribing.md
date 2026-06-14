# Dual-TX AI Scribing Setup

This note covers deterministic Doctor/Patient labels for the AI Consultation Recorder when using a two-transmitter receiver such as DJI Mic Mini.

## Hardware Setup

- Connect the DJI Mic Mini receiver to the laptop over USB-C.
- On macOS, select `Wireless Mic Rx` as the default input device.
- On the receiver, use stereo or split output mode when available. The browser must receive two input channels for deterministic labels.
- Clip one transmitter to the doctor and one to the patient, then choose the matching assignment in the AI Scribe control bar:
  - Left / Channel 1 = Doctor, Right / Channel 2 = Patient
  - Left / Channel 1 = Patient, Right / Channel 2 = Doctor

## Browser Behavior

The recorder requests `channelCount: 2` and `sampleRate: 48000`, but the browser and device driver may still return mono. Device labels may be hidden until microphone permission is granted, so the UI does not depend on stable hardware labels.

When the active media track reports two channels, the web app preserves the original recording and also records left/right mono channel files. The `consultation-scribe` Edge Function transcribes those channel files separately and merges the transcript with the configured Doctor/Patient labels.

When the active media track reports mono or channel count is unavailable, the app keeps the existing single-file Whisper path. Speaker labels then fall back to best-effort automatic labeling and remain editable in the transcript panel.

## Data Handling

No database schema change is required. The channel assignment and detected channel count are sent as request/audit metadata. Split channel audio files are uploaded to the private `consultation-audio` bucket beside the main consultation recording and are used only when both left and right files are present.
