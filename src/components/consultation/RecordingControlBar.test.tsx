import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SPEAKER_CHANNEL_MAP } from '../../lib/consultation-scribe';
import type { ConsultationScribeController } from '../../hooks/use-consultation-scribe-controller';
import type { AudioChannelDetectionResult, AudioSetupSampleResult } from '../../hooks/use-audio-recorder';
import { RecordingControlBar } from './RecordingControlBar';

const buildController = (
  overrides: Partial<Pick<ConsultationScribeController, 'stereoInputAvailable'>> & {
    channelCount?: number | null;
    sampleResults?: AudioChannelDetectionResult[];
    setupSamples?: AudioSetupSampleResult[];
  } = {}
): ConsultationScribeController => {
  const sampleResults = [...(overrides.sampleResults ?? [])];
  const setupSamples = [...(overrides.setupSamples ?? [
    {
      blob: new Blob(['doctor-reference'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      channelCount: overrides.channelCount ?? 1,
      sampleRate: 48000,
    },
    {
      blob: new Blob(['patient-reference'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      channelCount: overrides.channelCount ?? 1,
      sampleRate: 48000,
    },
  ])];
  const defaultSampleResult: AudioChannelDetectionResult = {
    status: 'fallback',
    reason: 'mono',
    channelCount: 1,
    sampleRate: 48000,
    leftEnergy: 0,
    rightEnergy: 0,
    confidence: 0,
  };
  const recorder: ConsultationScribeController['recorder'] = {
    status: 'idle',
    elapsedSeconds: 0,
    error: null,
    isSupported: true,
    devices: [],
    selectedDeviceId: null,
    stream: null,
    channelStreams: null,
    channelCount: overrides.channelCount ?? null,
    sampleRate: null,
    start: vi.fn(async () => null),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(async () => null),
    reset: vi.fn(),
    selectDevice: vi.fn(),
    refreshDevices: vi.fn(async () => undefined),
    prepareSetupInput: vi.fn(async () => undefined),
    sampleInputChannels: vi.fn(async (): Promise<AudioChannelDetectionResult> =>
      sampleResults.shift() ?? defaultSampleResult
    ),
    recordSetupSample: vi.fn(async (): Promise<AudioSetupSampleResult | null> =>
      setupSamples.shift() ?? null
    ),
    stopSetupInput: vi.fn(),
  };
  return {
    recorder,
    data: null,
    loading: false,
    refetch: vi.fn(),
    isProcessing: false,
    isTranscribing: false,
    isGenerating: false,
    isLoadingSuggestions: false,
    feedback: null,
    setFeedback: vi.fn(),
    startRecording: vi.fn(async () => undefined),
    stopAndProcess: vi.fn(async () => undefined),
    retryProcessing: vi.fn(async () => undefined),
    discard: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => undefined),
    suggestions: [],
    fetchSuggestions: vi.fn(async () => undefined),
    dismissSuggestion: vi.fn(),
    markApproved: vi.fn(async () => undefined),
    relabelSegments: vi.fn(async () => undefined),
    mode: 'recorded',
    setMode: vi.fn(),
    liveEntries: [],
    liveTranscriptText: '',
    liveTranscribing: false,
    liveCues: [],
    dismissCue: vi.fn(),
    speakerChannelMap: DEFAULT_SPEAKER_CHANNEL_MAP,
    setSpeakerChannelMap: vi.fn(),
    scribeInputMode: 'voice_context',
    setScribeInputMode: vi.fn(),
    stereoInputAvailable: overrides.stereoInputAvailable ?? false,
    setSpeakerReferenceSample: vi.fn(),
  };
};

describe('RecordingControlBar setup wizard', () => {
  it('opens TX setup without requesting consent', async () => {
    const user = userEvent.setup();
    const controller = buildController();

    render(<RecordingControlBar controller={controller} patientName="Aisha" />);

    await user.click(screen.getByRole('button', { name: 'Start source setup' }));

    await waitFor(() => expect(screen.getByText('TX / voice source setup')).toBeInTheDocument());
    expect(screen.queryByText('Patient Consent Required')).not.toBeInTheDocument();
    expect(controller.recorder.prepareSetupInput).toHaveBeenCalledTimes(1);
  });

  it('uses separated TX1 and TX2 sources when stereo checks are confident', async () => {
    const user = userEvent.setup();
    const controller = buildController({
      channelCount: 2,
      stereoInputAvailable: true,
      sampleResults: [
        {
          status: 'detected',
          activeChannel: 'left',
          channelCount: 2,
          sampleRate: 48000,
          leftEnergy: 0.08,
          rightEnergy: 0.01,
          confidence: 8,
        },
        {
          status: 'detected',
          activeChannel: 'right',
          channelCount: 2,
          sampleRate: 48000,
          leftEnergy: 0.01,
          rightEnergy: 0.07,
          confidence: 7,
        },
      ],
    });

    render(<RecordingControlBar controller={controller} patientName="Aisha" />);

    expect(screen.getByText('Source setup')).toBeInTheDocument();
    expect(screen.queryByText('Check the doctor and patient voices before you begin.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start source setup' }));
    await user.click(screen.getByRole('button', { name: 'Doctor spoke' }));

    expect(screen.getByText('Aisha voice / TX2 check')).toBeInTheDocument();
    expect(screen.getByText(/TX1 check complete/i)).toBeInTheDocument();
    expect(screen.queryByText("Confirm the doctor's voice")).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor is on Left / Channel 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Patient spoke' }));

    expect(screen.getByText('Start the conversation')).toBeInTheDocument();
    expect(screen.getByText('TX1 and TX2 are distinguished.')).toBeInTheDocument();
    expect(screen.getByText(/The scribe will label Doctor and Patient automatically/i)).toBeInTheDocument();
    expect(screen.queryByText(/The browser receives them as one combined signal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/separation unclear/i)).not.toBeInTheDocument();
    expect(screen.getByText('TX1 / separate source')).toBeInTheDocument();
    expect(screen.getByText('TX2 / separate source')).toBeInTheDocument();
    expect(controller.setSpeakerChannelMap).toHaveBeenLastCalledWith(DEFAULT_SPEAKER_CHANNEL_MAP);
    expect(controller.setScribeInputMode).toHaveBeenLastCalledWith('stereo_separated');
    expect(controller.recorder.recordSetupSample).toHaveBeenCalledTimes(2);
    expect(controller.setSpeakerReferenceSample).toHaveBeenNthCalledWith(
      1,
      'doctor',
      expect.objectContaining({ mimeType: 'audio/webm' })
    );
    expect(controller.setSpeakerReferenceSample).toHaveBeenNthCalledWith(
      2,
      'patient',
      expect.objectContaining({ mimeType: 'audio/webm' })
    );

    await user.click(screen.getByRole('button', { name: 'Start Recording' }));

    expect(controller.startRecording).toHaveBeenCalledTimes(1);
  });

  it('lets mixed input continue with voice and context labeling', async () => {
    const user = userEvent.setup();
    const controller = buildController({
      channelCount: 1,
      stereoInputAvailable: false,
      sampleResults: [
        {
          status: 'fallback',
          reason: 'mono',
          channelCount: 1,
          sampleRate: 48000,
          leftEnergy: 0.04,
          rightEnergy: 0,
          confidence: 0,
        },
        {
          status: 'fallback',
          reason: 'mono',
          channelCount: 1,
          sampleRate: 48000,
          leftEnergy: 0.03,
          rightEnergy: 0,
          confidence: 0,
        },
      ],
    });

    render(
      <RecordingControlBar
        controller={controller}
        patientName="Aisha"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Start source setup' }));
    await user.click(screen.getByRole('button', { name: 'Doctor spoke' }));

    expect(screen.getByText('Aisha voice / TX2 check')).toBeInTheDocument();
    expect(screen.getByText('Ask Aisha to speak using TX2 so the scribe can compare the audio signal.')).toBeInTheDocument();
    expect(screen.queryByText(/Both voices appear to be coming through the same microphone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The browser receives them as one combined signal/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Confirm the doctor's voice")).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor is on Left / Channel 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Doctor is on Right / Channel 2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Patient spoke' }));

    expect(screen.getByText('Start the conversation')).toBeInTheDocument();
    expect(screen.getByText('TX1 and TX2 voice checks are complete.')).toBeInTheDocument();
    expect(screen.getByText('TX1 and TX2 voice checks are complete. The scribe will use those checks and conversation content to identify Doctor and Patient.')).toBeInTheDocument();
    expect(screen.queryByText(/not distinguishable/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Conversation content will be used to identify Doctor and Patient.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Both transmitters are audible, but the browser receives them as one combined signal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot see a hardware TX identity inside a combined signal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Input detected:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/separation unclear/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Both voices appear to be coming through the same microphone/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Advanced diagnostics' })).not.toBeInTheDocument();
    expect(screen.queryByText(/\b(review|correct|manual|assign)\b/i)).not.toBeInTheDocument();
    expect(controller.setScribeInputMode).toHaveBeenLastCalledWith('voice_context');
    expect(controller.recorder.recordSetupSample).toHaveBeenCalledTimes(2);
    expect(controller.setSpeakerReferenceSample).toHaveBeenNthCalledWith(
      1,
      'doctor',
      expect.objectContaining({ mimeType: 'audio/webm' })
    );
    expect(controller.setSpeakerReferenceSample).toHaveBeenNthCalledWith(
      2,
      'patient',
      expect.objectContaining({ mimeType: 'audio/webm' })
    );

    await user.click(screen.getByRole('button', { name: 'Start Recording' }));

    expect(controller.startRecording).toHaveBeenCalledTimes(1);
  });
});
