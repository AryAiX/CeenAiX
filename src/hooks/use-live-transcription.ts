import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeLiveChunk } from '../lib/consultation-scribe';

export interface LiveTranscriptEntry {
  id: string;
  text: string;
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
  active: boolean;
  recordingId: string | null;
}): UseLiveTranscriptionResult {
  const { stream, active, recordingId } = input;

  const [entries, setEntries] = useState<LiveTranscriptEntry[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);
  const recordingIdRef = useRef<string | null>(null);

  recordingIdRef.current = recordingId;

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
          const result = await transcribeLiveChunk({ recordingId: id, blob });
          const text = result.text.trim();
          if (text) {
            setEntries((current) => [...current, { id: `${Date.now()}-${current.length}`, text }]);
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

  useEffect(() => {
    const shouldRun = active && Boolean(stream) && Boolean(recordingId);

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
      recorder.start();
      clearRotate();
      rotateTimerRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, SEGMENT_MS);
    };

    if (shouldRun) {
      activeRef.current = true;
      startSegment();
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
    };
  }, [active, stream, recordingId, enqueueChunk]);

  const transcriptText = entries.map((entry) => entry.text).join(' ');

  return { entries, transcriptText, isTranscribing, error, reset };
}
