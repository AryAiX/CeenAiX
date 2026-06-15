import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeLiveChunk } from '../lib/consultation-scribe';
import type { AudioInputChannel, SpeakerChannelMap, TranscriptSpeaker } from '../types';

export interface LiveTranscriptEntry {
  id: string;
  text: string;
  speaker: TranscriptSpeaker;
  sourceChannel: AudioInputChannel | null;
}

export interface UseLiveTranscriptionResult {
  entries: LiveTranscriptEntry[];
  transcriptText: string;
  isTranscribing: boolean;
  error: string | null;
  reset: () => void;
}

const SEGMENT_MS = 7000;
const MIN_CHUNK_BYTES = 2000;

const pickSupportedMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

/**
 * Near-real-time transcription for live mode. Whisper is a batch API, so we
 * record the shared stream in short, self-contained segments (each a complete
 * file) and transcribe them as they close, appending to a running transcript.
 */
export function useLiveTranscription(input: {
  stream: MediaStream | null;
  channelStreams: Partial<Record<AudioInputChannel, MediaStream>> | null;
  active: boolean;
  recordingId: string | null;
  speakerChannelMap: SpeakerChannelMap;
  stereoAvailable: boolean;
}): UseLiveTranscriptionResult {
  const { stream, channelStreams, active, recordingId, speakerChannelMap, stereoAvailable } = input;

  const [entries, setEntries] = useState<LiveTranscriptEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const channelRecordersRef = useRef<Partial<Record<AudioInputChannel, MediaRecorder>>>({});
  const chunksRef = useRef<Blob[]>([]);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);
  const recordingIdRef = useRef<string | null>(null);
  const speakerChannelMapRef = useRef<SpeakerChannelMap>(speakerChannelMap);

  recordingIdRef.current = recordingId;
  speakerChannelMapRef.current = speakerChannelMap;

  const reset = useCallback(() => {
    setEntries([]);
    setError(null);
    setIsTranscribing(false);
  }, []);

  const enqueueChunk = useCallback((blob: Blob) => {
    const id = recordingIdRef.current;
    if (!id || blob.size < MIN_CHUNK_BYTES) {
      return;
    }
    inFlightRef.current += 1;
    setIsTranscribing(true);
    // Chain requests so transcript order matches capture order.
    queueRef.current = queueRef.current
      .then(async () => {
        try {
          const result = await transcribeLiveChunk({
            recordingId: id,
            blob,
            speakerChannelMap: speakerChannelMapRef.current,
            sourceChannel: null,
          });
          const text = result.text.trim();
          if (text) {
            setEntries((current) => [
              ...current,
              { id: `${Date.now()}-${current.length}`, text, speaker: result.speaker, sourceChannel: null },
            ]);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Live transcription failed for a segment.');
        }
      })
      .finally(() => {
        inFlightRef.current -= 1;
        if (inFlightRef.current <= 0) {
          inFlightRef.current = 0;
          setIsTranscribing(false);
        }
      });
  }, []);

  const enqueueChannelChunks = useCallback((chunks: Partial<Record<AudioInputChannel, Blob>>) => {
    const id = recordingIdRef.current;
    const validChunks = (['left', 'right'] as const)
      .map((channel) => ({ channel, blob: chunks[channel] }))
      .filter((item): item is { channel: AudioInputChannel; blob: Blob } => Boolean(item.blob && item.blob.size >= MIN_CHUNK_BYTES));
    if (!id || validChunks.length === 0) {
      return;
    }
    inFlightRef.current += validChunks.length;
    setIsTranscribing(true);
    queueRef.current = queueRef.current
      .then(async () => {
        const results = await Promise.all(
          validChunks.map(async ({ channel, blob }) => {
            const result = await transcribeLiveChunk({
              recordingId: id,
              blob,
              speakerChannelMap: speakerChannelMapRef.current,
              sourceChannel: channel,
            });
            return { channel, result };
          })
        );
        setEntries((current) => [
          ...current,
          ...results
            .map(({ channel, result }) => ({
              id: `${Date.now()}-${channel}-${current.length}`,
              text: result.text.trim(),
              speaker: speakerChannelMapRef.current[channel],
              sourceChannel: channel,
            }))
            .filter((entry) => entry.text.length > 0),
        ]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Live transcription failed for a channel segment.');
      })
      .finally(() => {
        inFlightRef.current -= validChunks.length;
        if (inFlightRef.current <= 0) {
          inFlightRef.current = 0;
          setIsTranscribing(false);
        }
      });
  }, []);

  useEffect(() => {
    const useSplitChannels =
      active &&
      stereoAvailable &&
      Boolean(channelStreams?.left) &&
      Boolean(channelStreams?.right) &&
      Boolean(recordingId);
    const shouldRun = active && Boolean(recordingId) && (useSplitChannels || Boolean(stream));

    const clearRotate = () => {
      if (rotateTimerRef.current) {
        clearTimeout(rotateTimerRef.current);
        rotateTimerRef.current = null;
      }
    };

    const startSegment = () => {
      if (!activeRef.current || !stream) return;
      const mimeType = pickSupportedMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        return;
      }
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        if (chunksRef.current.length > 0) {
          enqueueChunk(new Blob(chunksRef.current, { type }));
        }
        chunksRef.current = [];
        if (activeRef.current) {
          startSegment();
        }
      };
      recorderRef.current = recorder;
      channelRecordersRef.current = {};
      recorder.start();
      clearRotate();
      rotateTimerRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, SEGMENT_MS);
    };

    const startChannelSegment = () => {
      if (!activeRef.current || !channelStreams?.left || !channelStreams.right) return;
      const activeChannelStreams: Record<AudioInputChannel, MediaStream> = {
        left: channelStreams.left,
        right: channelStreams.right,
      };
      const mimeType = pickSupportedMimeType();
      const channelChunks: Partial<Record<AudioInputChannel, Blob[]>> = {};
      const completed: Partial<Record<AudioInputChannel, Blob>> = {};
      const recorders: Partial<Record<AudioInputChannel, MediaRecorder>> = {};
      let stoppedCount = 0;
      let enqueued = false;

      const maybeEnqueue = () => {
        if (!enqueued && stoppedCount >= 2) {
          enqueued = true;
          enqueueChannelChunks(completed);
        }
      };

      for (const channel of ['left', 'right'] as const) {
        try {
          const recorder = new MediaRecorder(activeChannelStreams[channel], mimeType ? { mimeType } : undefined);
          const chunks: Blob[] = [];
          channelChunks[channel] = chunks;
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          recorder.onstop = () => {
            stoppedCount += 1;
            const type = recorder.mimeType || mimeType || 'audio/webm';
            if (chunks.length > 0) {
              completed[channel] = new Blob(chunks, { type });
            }
            maybeEnqueue();
            if (activeRef.current && stoppedCount >= 2) {
              maybeEnqueue();
              startChannelSegment();
            }
          };
          recorders[channel] = recorder;
        } catch {
          return;
        }
      }

      channelRecordersRef.current = recorders;
      Object.values(recorders).forEach((recorder) => recorder.start());
      clearRotate();
      rotateTimerRef.current = setTimeout(() => {
        Object.values(recorders).forEach((recorder) => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        });
      }, SEGMENT_MS);
    };

    if (shouldRun) {
      activeRef.current = true;
      if (useSplitChannels) {
        startChannelSegment();
      } else {
        startSegment();
      }
    }

    return () => {
      activeRef.current = false;
      clearRotate();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        // Final partial segment still gets transcribed via onstop → enqueueChunk.
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      recorderRef.current = null;
      Object.values(channelRecordersRef.current).forEach((channelRecorder) => {
        if (channelRecorder.state !== 'inactive') {
          try {
            channelRecorder.stop();
          } catch {
            // ignore
          }
        }
      });
      channelRecordersRef.current = {};
    };
  }, [active, channelStreams, enqueueChannelChunks, enqueueChunk, recordingId, stereoAvailable, stream]);

  const transcriptText = entries
    .map((entry) => {
      const speaker = entry.speaker === 'doctor' ? 'Doctor' : entry.speaker === 'patient' ? 'Patient' : 'Speaker';
      return `${speaker}: ${entry.text}`;
    })
    .join(' ');

  return { entries, transcriptText, isTranscribing, error, reset };
}
