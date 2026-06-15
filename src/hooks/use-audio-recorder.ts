import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioInputChannel } from '../types';

export type AudioRecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'error';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface AudioCaptureInfo {
  channelCount: number | null;
  sampleRate: number | null;
}

export type AudioChannelDetectionReason = 'mono' | 'low-signal' | 'unclear' | 'unsupported' | 'microphone-error';

interface AudioChannelDetectionBase extends AudioCaptureInfo {
  leftEnergy: number;
  rightEnergy: number;
  confidence: number;
}

export interface AudioChannelDetectedResult extends AudioChannelDetectionBase {
  status: 'detected';
  activeChannel: AudioInputChannel;
}

export interface AudioChannelFallbackResult extends AudioChannelDetectionBase {
  status: 'fallback';
  reason: AudioChannelDetectionReason;
}

export type AudioChannelDetectionResult = AudioChannelDetectedResult | AudioChannelFallbackResult;

export interface AudioRecordingResult {
  blob: Blob;
  channelBlobs: Partial<Record<AudioInputChannel, Blob>>;
  channelCount: number | null;
  sampleRate: number | null;
  mimeType: string;
}

export interface AudioSetupSampleResult extends AudioCaptureInfo {
  blob: Blob;
  mimeType: string;
}

export interface UseAudioRecorderResult {
  status: AudioRecorderStatus;
  elapsedSeconds: number;
  error: string | null;
  isSupported: boolean;
  devices: AudioInputDevice[];
  selectedDeviceId: string | null;
  stream: MediaStream | null;
  channelStreams: Partial<Record<AudioInputChannel, MediaStream>> | null;
  channelCount: number | null;
  sampleRate: number | null;
  start: () => Promise<AudioCaptureInfo | null>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<AudioRecordingResult | null>;
  reset: () => void;
  selectDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  prepareSetupInput: () => Promise<void>;
  sampleInputChannels: () => Promise<AudioChannelDetectionResult>;
  recordSetupSample: (durationMs?: number) => Promise<AudioSetupSampleResult | null>;
  stopSetupInput: () => void;
}

const pickSupportedMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

const detectSupport = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices !== 'undefined' &&
  typeof navigator.mediaDevices.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

const AUDIO_CHANNELS: readonly AudioInputChannel[] = ['left', 'right'];

type RecorderSet = Partial<Record<AudioInputChannel, MediaRecorder>>;
type ChunkSet = Partial<Record<AudioInputChannel, Blob[]>>;
type AudioContextConstructor = typeof AudioContext;
type AudioConstraintMode = 'strict-stereo' | 'preferred-stereo';

interface SplitAudioGraph {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  splitter: ChannelSplitterNode;
  destinations: Record<AudioInputChannel, MediaStreamAudioDestinationNode>;
}

interface SetupAudioAnalysis {
  stream: MediaStream;
  ownsStream: boolean;
  channelCount: number | null;
  sampleRate: number | null;
  context: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  splitter: ChannelSplitterNode | null;
  analysers: Partial<Record<AudioInputChannel, AnalyserNode>>;
  buffers: Partial<Record<AudioInputChannel, Float32Array>>;
  animationFrameId: number | null;
  peaks: Record<AudioInputChannel, number>;
}

const SETUP_SAMPLE_SETTLE_MS = 350;
const SETUP_REFERENCE_SAMPLE_MS = 1600;
const MIN_CONFIDENT_RMS = 0.012;
const MIN_CHANNEL_RATIO = 1.8;
const RMS_EPSILON = 0.000001;

const getPrimaryAudioSettings = (stream: MediaStream): AudioCaptureInfo => {
  const track = stream.getAudioTracks()[0];
  const settings = track?.getSettings();
  const capabilities = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { channelCount?: { max?: number; min?: number } })
    | undefined;
  const capabilityChannelCount =
    capabilities?.channelCount?.max === 1 && capabilities.channelCount.min === 1 ? 1 : null;
  return {
    channelCount: typeof settings?.channelCount === 'number' ? settings.channelCount : capabilityChannelCount,
    sampleRate: typeof settings?.sampleRate === 'number' ? settings.sampleRate : null,
  };
};

const getAudioContextCtor = (): AudioContextConstructor | null => {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext ??
    null
  );
};

const buildAudioConstraints = (
  selectedDeviceId: string | null,
  mode: AudioConstraintMode = 'preferred-stereo'
): MediaTrackConstraints => {
  const audioConstraints: MediaTrackConstraints = {
    channelCount: mode === 'strict-stereo' ? { ideal: 2, min: 2 } : { ideal: 2 },
    sampleRate: { ideal: 48000 },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  if (selectedDeviceId) {
    audioConstraints.deviceId = { exact: selectedDeviceId };
  }
  return audioConstraints;
};

const isChannelCountConstraintError = (error: unknown): boolean => {
  const candidate = error as { name?: unknown; constraint?: unknown };
  return candidate.name === 'OverconstrainedError' && (
    candidate.constraint === undefined ||
    candidate.constraint === null ||
    candidate.constraint === 'channelCount'
  );
};

const requestAudioInputStream = async (selectedDeviceId: string | null): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(selectedDeviceId, 'strict-stereo'),
    });
  } catch (error) {
    if (!isChannelCountConstraintError(error)) {
      throw error;
    }
    return navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(selectedDeviceId, 'preferred-stereo'),
    });
  }
};

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const calculateRms = (buffer: Float32Array): number => {
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (const sample of buffer) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / buffer.length);
};

const classifyChannelEnergies = (
  input: AudioCaptureInfo & { leftEnergy: number; rightEnergy: number }
): AudioChannelDetectionResult => {
  const { channelCount, sampleRate, leftEnergy, rightEnergy } = input;
  const louderEnergy = Math.max(leftEnergy, rightEnergy);
  const quieterEnergy = Math.min(leftEnergy, rightEnergy);
  const confidence = louderEnergy / Math.max(quieterEnergy, RMS_EPSILON);

  if (channelCount !== null && channelCount < 2) {
    return {
      status: 'fallback',
      reason: 'mono',
      channelCount,
      sampleRate,
      leftEnergy,
      rightEnergy,
      confidence,
    };
  }

  if (louderEnergy < MIN_CONFIDENT_RMS) {
    return {
      status: 'fallback',
      reason: 'low-signal',
      channelCount,
      sampleRate,
      leftEnergy,
      rightEnergy,
      confidence,
    };
  }

  if (confidence < MIN_CHANNEL_RATIO) {
    return {
      status: 'fallback',
      reason: 'unclear',
      channelCount,
      sampleRate,
      leftEnergy,
      rightEnergy,
      confidence,
    };
  }

  return {
    status: 'detected',
    activeChannel: leftEnergy > rightEnergy ? 'left' : 'right',
    channelCount,
    sampleRate,
    leftEnergy,
    rightEnergy,
    confidence,
  };
};

const createStereoSplitGraph = (stream: MediaStream): SplitAudioGraph | null => {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) {
    return null;
  }
  try {
    const context = new AudioContextCtor({ sampleRate: 48000 });
    const source = context.createMediaStreamSource(stream);
    const splitter = context.createChannelSplitter(2);
    splitter.channelCountMode = 'explicit';
    splitter.channelInterpretation = 'discrete';
    const leftDestination = context.createMediaStreamDestination();
    const rightDestination = context.createMediaStreamDestination();
    source.connect(splitter);
    splitter.connect(leftDestination, 0);
    splitter.connect(rightDestination, 1);
    return {
      context,
      source,
      splitter,
      destinations: {
        left: leftDestination,
        right: rightDestination,
      },
    };
  } catch {
    return null;
  }
};

const stopRecorder = async (
  recorder: MediaRecorder | null | undefined,
  chunks: Blob[],
  fallbackMimeType: string
): Promise<Blob | null> => {
  if (!recorder || recorder.state === 'inactive') {
    return chunks.length > 0 ? new Blob(chunks, { type: fallbackMimeType }) : null;
  }
  return new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      const type = recorder.mimeType || fallbackMimeType;
      resolve(chunks.length > 0 ? new Blob(chunks, { type }) : null);
    };
    try {
      recorder.stop();
    } catch {
      resolve(null);
    }
  });
};

/**
 * Wraps the Web Audio MediaRecorder API for consultation capture.
 * Handles permissions, device selection, pause/resume, and elapsed timing.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<AudioRecorderStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [channelStreams, setChannelStreams] = useState<Partial<Record<AudioInputChannel, MediaStream>> | null>(null);
  const [channelCount, setChannelCount] = useState<number | null>(null);
  const [sampleRate, setSampleRate] = useState<number | null>(null);

  const isSupported = detectSupport();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const channelRecordersRef = useRef<RecorderSet>({});
  const chunksRef = useRef<Blob[]>([]);
  const channelChunksRef = useRef<ChunkSet>({});
  const streamRef = useRef<MediaStream | null>(null);
  const splitGraphRef = useRef<SplitAudioGraph | null>(null);
  const setupAnalysisRef = useRef<SetupAudioAnalysis | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
  }, [clearTimer]);

  const stopSetupInput = useCallback(() => {
    const analysis = setupAnalysisRef.current;
    if (!analysis) return;
    if (analysis.animationFrameId !== null) {
      window.cancelAnimationFrame(analysis.animationFrameId);
    }
    analysis.source?.disconnect();
    analysis.splitter?.disconnect();
    Object.values(analysis.analysers).forEach((analyser) => analyser.disconnect());
    if (analysis.context) {
      void analysis.context.close();
    }
    if (analysis.ownsStream) {
      analysis.stream.getTracks().forEach((track) => track.stop());
    }
    setupAnalysisRef.current = null;
  }, []);

  const teardownStream = useCallback(() => {
    const graph = splitGraphRef.current;
    if (graph) {
      graph.source.disconnect();
      graph.splitter.disconnect();
      void graph.context.close();
      splitGraphRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setChannelStreams(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!isSupported || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      return;
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = all
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));
      setDevices(audioInputs);
      setSelectedDeviceId((current) => current ?? audioInputs[0]?.deviceId ?? null);
    } catch {
      // Device enumeration is best-effort; ignore failures.
    }
  }, [isSupported]);

  const prepareSetupInput = useCallback(async () => {
    if (setupAnalysisRef.current) {
      return;
    }
    if (!isSupported) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    setError(null);
    try {
      const activeRecordingStream = streamRef.current;
      const nextStream = activeRecordingStream ?? (await requestAudioInputStream(selectedDeviceId));
      const ownsStream = !activeRecordingStream;
      const captureInfo = getPrimaryAudioSettings(nextStream);
      setChannelCount(captureInfo.channelCount);
      setSampleRate(captureInfo.sampleRate);
      void refreshDevices();

      const analysis: SetupAudioAnalysis = {
        stream: nextStream,
        ownsStream,
        channelCount: captureInfo.channelCount,
        sampleRate: captureInfo.sampleRate,
        context: null,
        source: null,
        splitter: null,
        analysers: {},
        buffers: {},
        animationFrameId: null,
        peaks: { left: 0, right: 0 },
      };

      const AudioContextCtor = getAudioContextCtor();
      if (captureInfo.channelCount !== 1 && AudioContextCtor) {
        try {
          const context = new AudioContextCtor({ sampleRate: captureInfo.sampleRate ?? 48000 });
          const source = context.createMediaStreamSource(nextStream);
          const splitter = context.createChannelSplitter(2);
          splitter.channelCountMode = 'explicit';
          splitter.channelInterpretation = 'discrete';
          const leftAnalyser = context.createAnalyser();
          const rightAnalyser = context.createAnalyser();
          leftAnalyser.fftSize = 2048;
          rightAnalyser.fftSize = 2048;
          source.connect(splitter);
          splitter.connect(leftAnalyser, 0);
          splitter.connect(rightAnalyser, 1);
          analysis.context = context;
          analysis.source = source;
          analysis.splitter = splitter;
          analysis.analysers = { left: leftAnalyser, right: rightAnalyser };
          analysis.buffers = {
            left: new Float32Array(leftAnalyser.fftSize),
            right: new Float32Array(rightAnalyser.fftSize),
          };
          const tick = () => {
            for (const channel of AUDIO_CHANNELS) {
              const analyser = analysis.analysers[channel];
              const buffer = analysis.buffers[channel];
              if (analyser && buffer) {
                analyser.getFloatTimeDomainData(buffer);
                analysis.peaks[channel] = Math.max(analysis.peaks[channel], calculateRms(buffer));
              }
            }
            analysis.animationFrameId = window.requestAnimationFrame(tick);
          };
          void context.resume();
          tick();
        } catch {
          analysis.context = null;
          analysis.source = null;
          analysis.splitter = null;
          analysis.analysers = {};
          analysis.buffers = {};
        }
      }

      setupAnalysisRef.current = analysis;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone permission was denied. Allow microphone access and try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone was detected. Connect a microphone and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not check the microphone.');
      }
    }
  }, [isSupported, refreshDevices, selectedDeviceId]);

  const sampleInputChannels = useCallback(async (): Promise<AudioChannelDetectionResult> => {
    await prepareSetupInput();
    const analysis = setupAnalysisRef.current;
    if (!analysis) {
      return {
        status: 'fallback',
        reason: 'microphone-error',
        channelCount: null,
        sampleRate: null,
        leftEnergy: 0,
        rightEnergy: 0,
        confidence: 0,
      };
    }

    if (!analysis.context || !analysis.analysers.left || !analysis.analysers.right) {
      const result: AudioChannelDetectionResult = {
        status: 'fallback',
        reason: analysis.channelCount !== null && analysis.channelCount < 2 ? 'mono' : 'unsupported',
        channelCount: analysis.channelCount,
        sampleRate: analysis.sampleRate,
        leftEnergy: analysis.peaks.left,
        rightEnergy: analysis.peaks.right,
        confidence: 0,
      };
      analysis.peaks = { left: 0, right: 0 };
      return result;
    }

    await wait(SETUP_SAMPLE_SETTLE_MS);
    const result = classifyChannelEnergies({
      channelCount: analysis.channelCount,
      sampleRate: analysis.sampleRate,
      leftEnergy: analysis.peaks.left,
      rightEnergy: analysis.peaks.right,
    });
    analysis.peaks = { left: 0, right: 0 };
    return result;
  }, [prepareSetupInput]);

  const recordSetupSample = useCallback(
    async (durationMs = SETUP_REFERENCE_SAMPLE_MS): Promise<AudioSetupSampleResult | null> => {
      await prepareSetupInput();
      const analysis = setupAnalysisRef.current;
      if (!analysis) {
        return null;
      }

      const mimeType = pickSupportedMimeType();
      const chunks: Blob[] = [];

      return new Promise<AudioSetupSampleResult | null>((resolve) => {
        let resolved = false;
        const finish = (value: AudioSetupSampleResult | null) => {
          if (resolved) return;
          resolved = true;
          resolve(value);
        };

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(analysis.stream, mimeType ? { mimeType } : undefined);
        } catch {
          finish(null);
          return;
        }

        const fallbackMimeType = recorder.mimeType || mimeType || 'audio/webm';
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        recorder.onerror = () => finish(null);
        recorder.onstop = () => {
          const blob = chunks.length > 0 ? new Blob(chunks, { type: fallbackMimeType }) : null;
          finish(blob && blob.size > 0
            ? {
                blob,
                mimeType: blob.type || fallbackMimeType,
                channelCount: analysis.channelCount,
                sampleRate: analysis.sampleRate,
              }
            : null);
        };

        try {
          recorder.start();
        } catch {
          finish(null);
          return;
        }

        window.setTimeout(() => {
          if (recorder.state === 'inactive') {
            return;
          }
          try {
            recorder.stop();
          } catch {
            finish(null);
          }
        }, Math.max(500, durationMs));
      });
    },
    [prepareSetupInput]
  );

  const start = useCallback(async (): Promise<AudioCaptureInfo | null> => {
    if (!isSupported) {
      setStatus('error');
      setError('Audio recording is not supported in this browser.');
      return null;
    }
    setError(null);
    setStatus('requesting');
    try {
      stopSetupInput();
      const nextStream = await requestAudioInputStream(selectedDeviceId);
      streamRef.current = nextStream;
      setStream(nextStream);
      void refreshDevices();
      const captureInfo = getPrimaryAudioSettings(nextStream);
      setChannelCount(captureInfo.channelCount);
      setSampleRate(captureInfo.sampleRate);

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(nextStream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current = recorder;
      channelRecordersRef.current = {};
      channelChunksRef.current = {};

      if ((captureInfo.channelCount ?? 0) >= 2) {
        const graph = createStereoSplitGraph(nextStream);
        splitGraphRef.current = graph;
        if (graph) {
          const nextChannelStreams: Partial<Record<AudioInputChannel, MediaStream>> = {
            left: graph.destinations.left.stream,
            right: graph.destinations.right.stream,
          };
          setChannelStreams(nextChannelStreams);
          for (const channel of AUDIO_CHANNELS) {
            const channelRecorder = new MediaRecorder(graph.destinations[channel].stream, mimeType ? { mimeType } : undefined);
            const channelChunks: Blob[] = [];
            channelChunksRef.current[channel] = channelChunks;
            channelRecorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                channelChunks.push(event.data);
              }
            };
            channelRecordersRef.current[channel] = channelRecorder;
            channelRecorder.start(1000);
          }
        }
      }

      recorder.start(1000);
      setElapsedSeconds(0);
      startTimer();
      setStatus('recording');
      return captureInfo;
    } catch (err) {
      teardownStream();
      clearTimer();
      setStatus('error');
      setChannelCount(null);
      setSampleRate(null);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone permission was denied. Allow microphone access and try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone was detected. Connect a microphone and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not start the microphone.');
      }
      return null;
    }
  }, [isSupported, selectedDeviceId, refreshDevices, startTimer, teardownStream, clearTimer, stopSetupInput]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      Object.values(channelRecordersRef.current).forEach((channelRecorder) => {
        if (channelRecorder.state === 'recording') {
          channelRecorder.pause();
        }
      });
      clearTimer();
      setStatus('paused');
    }
  }, [clearTimer]);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      Object.values(channelRecordersRef.current).forEach((channelRecorder) => {
        if (channelRecorder.state === 'paused') {
          channelRecorder.resume();
        }
      });
      startTimer();
      setStatus('recording');
    }
  }, [startTimer]);

  const stop = useCallback(async (): Promise<AudioRecordingResult | null> => {
    const recorder = mediaRecorderRef.current;
    const fallbackMimeType = recorder?.mimeType || pickSupportedMimeType() || 'audio/webm';
    if (!recorder || recorder.state === 'inactive') {
      teardownStream();
      clearTimer();
      setStatus('idle');
      return null;
    }
    setStatus('idle');
    const [blob, ...channelResults] = await Promise.all([
      stopRecorder(recorder, chunksRef.current, fallbackMimeType),
      ...AUDIO_CHANNELS.map((channel) =>
        stopRecorder(channelRecordersRef.current[channel], channelChunksRef.current[channel] ?? [], fallbackMimeType)
      ),
    ]);
    teardownStream();
    clearTimer();
    channelRecordersRef.current = {};
    if (!blob) {
      return null;
    }
    const channelBlobs = AUDIO_CHANNELS.reduce<Partial<Record<AudioInputChannel, Blob>>>((acc, channel, index) => {
      const channelBlob = channelResults[index];
      if (channelBlob && channelBlob.size > 0) {
        acc[channel] = channelBlob;
      }
      return acc;
    }, {});
    return {
      blob,
      channelBlobs,
      channelCount,
      sampleRate,
      mimeType: blob.type || fallbackMimeType,
    };
  }, [teardownStream, clearTimer, channelCount, sampleRate]);

  const reset = useCallback(() => {
    stopSetupInput();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    Object.values(channelRecordersRef.current).forEach((channelRecorder) => {
      if (channelRecorder.state !== 'inactive') {
        try {
          channelRecorder.stop();
        } catch {
          // ignore
        }
      }
    });
    teardownStream();
    clearTimer();
    chunksRef.current = [];
    channelChunksRef.current = {};
    channelRecordersRef.current = {};
    mediaRecorderRef.current = null;
    setElapsedSeconds(0);
    setError(null);
    setStatus('idle');
  }, [teardownStream, clearTimer, stopSetupInput]);

  const selectDevice = useCallback((deviceId: string) => {
    stopSetupInput();
    setSelectedDeviceId(deviceId);
  }, [stopSetupInput]);

  useEffect(() => {
    return () => {
      stopSetupInput();
      clearTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (splitGraphRef.current) {
        void splitGraphRef.current.context.close();
      }
    };
  }, [clearTimer, stopSetupInput]);

  return {
    status,
    elapsedSeconds,
    error,
    isSupported,
    devices,
    selectedDeviceId,
    stream,
    channelStreams,
    channelCount,
    sampleRate,
    start,
    pause,
    resume,
    stop,
    reset,
    selectDevice,
    refreshDevices,
    prepareSetupInput,
    sampleInputChannels,
    recordSetupSample,
    stopSetupInput,
  };
}
