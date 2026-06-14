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

export interface AudioRecordingResult {
  blob: Blob;
  channelBlobs: Partial<Record<AudioInputChannel, Blob>>;
  channelCount: number | null;
  sampleRate: number | null;
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

interface SplitAudioGraph {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  splitter: ChannelSplitterNode;
  destinations: Record<AudioInputChannel, MediaStreamAudioDestinationNode>;
}

const getPrimaryAudioSettings = (stream: MediaStream): AudioCaptureInfo => {
  const settings = stream.getAudioTracks()[0]?.getSettings();
  return {
    channelCount: typeof settings?.channelCount === 'number' ? settings.channelCount : null,
    sampleRate: typeof settings?.sampleRate === 'number' ? settings.sampleRate : null,
  };
};

const createStereoSplitGraph = (stream: MediaStream): SplitAudioGraph | null => {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  try {
    const context = new AudioContextCtor({ sampleRate: 48000 });
    const source = context.createMediaStreamSource(stream);
    const splitter = context.createChannelSplitter(2);
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

  const start = useCallback(async (): Promise<AudioCaptureInfo | null> => {
    if (!isSupported) {
      setStatus('error');
      setError('Audio recording is not supported in this browser.');
      return null;
    }
    setError(null);
    setStatus('requesting');
    try {
      const audioConstraints: MediaTrackConstraints = {
        channelCount: { ideal: 2 },
        sampleRate: { ideal: 48000 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      const constraints: MediaStreamConstraints = {
        audio: audioConstraints,
      };
      const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
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
  }, [isSupported, selectedDeviceId, refreshDevices, startTimer, teardownStream, clearTimer]);

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
  }, [teardownStream, clearTimer]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (splitGraphRef.current) {
        void splitGraphRef.current.context.close();
      }
    };
  }, [clearTimer]);

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
  };
}
