import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  extractSmartSuggestions,
  generateClinicalNote,
  transcribeConsultation,
  uploadConsultationAudio,
} from '../lib/consultation-scribe';
import type {
  ClinicalNoteOutputLanguage,
  ClinicalNotePromptTemplate,
  ConsultationConsentMethod,
  ConsultationRecording,
  SmartSuggestion,
  TranscriptSegment,
} from '../types';
import { useAudioRecorder } from './use-audio-recorder';
import { useConsultationScribe } from './use-consultation-scribe';

export interface ScribeConsentInput {
  informedPatient: boolean;
  verbalConsent: boolean;
  consentMethod: ConsultationConsentMethod;
  signatureImageUrl: string | null;
}

export interface ScribeRegenerateInput {
  promptTemplate: ClinicalNotePromptTemplate;
  outputLanguage: ClinicalNoteOutputLanguage;
  customInstructions: string | null;
  transcriptOverride: string | null;
}

export type ScribeFeedback = { type: 'success' | 'error'; message: string } | null;

export interface ConsultationScribeController {
  recorder: ReturnType<typeof useAudioRecorder>;
  data: ReturnType<typeof useConsultationScribe>['data'];
  loading: boolean;
  refetch: () => void;
  isProcessing: boolean;
  isTranscribing: boolean;
  isGenerating: boolean;
  isLoadingSuggestions: boolean;
  feedback: ScribeFeedback;
  setFeedback: (feedback: ScribeFeedback) => void;
  consentOpen: boolean;
  openConsent: () => void;
  closeConsent: () => void;
  startWithConsent: (input: ScribeConsentInput) => Promise<void>;
  stopAndProcess: () => Promise<void>;
  retryProcessing: () => Promise<void>;
  discard: () => Promise<void>;
  regenerate: (input: ScribeRegenerateInput) => Promise<void>;
  suggestions: SmartSuggestion[];
  fetchSuggestions: () => Promise<void>;
  dismissSuggestion: (id: string) => void;
  markApproved: () => Promise<void>;
  relabelSegments: (segments: TranscriptSegment[]) => Promise<void>;
}

export function useConsultationScribeController(input: {
  appointmentId: string | null | undefined;
  doctorId: string | null | undefined;
  patientId: string | null | undefined;
  clinicId: string | null;
}): ConsultationScribeController {
  const recorder = useAudioRecorder();
  const { data, loading, refetch, actions } = useConsultationScribe(input.doctorId, input.appointmentId);

  const [consentOpen, setConsentOpen] = useState(false);
  const [activeRecording, setActiveRecording] = useState<ConsultationRecording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<ScribeFeedback>(null);

  useEffect(() => {
    setActiveRecording(null);
    setSuggestions([]);
    setDismissed(new Set());
    setFeedback(null);
  }, [input.appointmentId]);

  const currentRecording = activeRecording ?? data?.recording ?? null;
  const isProcessing = isTranscribing || isGenerating;

  const openConsent = useCallback(() => setConsentOpen(true), []);
  const closeConsent = useCallback(() => setConsentOpen(false), []);

  const startWithConsent = useCallback(
    async (consent: ScribeConsentInput) => {
      if (!input.appointmentId || !input.doctorId || !input.patientId) {
        return;
      }
      setFeedback(null);
      setConsentOpen(false);
      await recorder.start();
      // recorder.start updates its own status; bail if it failed to acquire mic.
      // We read the latest status via a microtask since state updates are async.
      try {
        const recording = await actions.createRecording({
          appointmentId: input.appointmentId,
          doctorId: input.doctorId,
          patientId: input.patientId,
          clinicId: input.clinicId,
          consentMethod: consent.consentMethod,
          informedPatient: consent.informedPatient,
          verbalConsent: consent.verbalConsent,
          signatureImageUrl: consent.signatureImageUrl,
        });
        setActiveRecording(recording);
        refetch();
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not start the recording session.',
        });
      }
    },
    [actions, input.appointmentId, input.doctorId, input.patientId, input.clinicId, recorder, refetch]
  );

  const stopAndProcess = useCallback(async () => {
    const recording = currentRecording;
    if (!recording || !input.doctorId) {
      return;
    }
    setFeedback(null);
    const elapsed = recorder.elapsedSeconds;
    const blob = await recorder.stop();
    if (!blob || blob.size === 0) {
      await actions.discardRecording(recording);
      setActiveRecording(null);
      refetch();
      setFeedback({ type: 'error', message: 'No audio was captured, so the recording was discarded.' });
      return;
    }

    try {
      const upload = await uploadConsultationAudio({
        doctorId: input.doctorId,
        appointmentId: recording.appointment_id,
        blob,
      });
      await actions.attachAudioAndProcess({
        recordingId: recording.id,
        appointmentId: recording.appointment_id,
        audioStoragePath: upload.path,
        audioMimeType: upload.mimeType,
        durationSeconds: elapsed,
      });
      refetch();

      setIsTranscribing(true);
      await transcribeConsultation({ recordingId: recording.id });
      setIsTranscribing(false);

      setIsGenerating(true);
      await generateClinicalNote({ recordingId: recording.id, outputLanguage: 'en' });
      setIsGenerating(false);

      refetch();
      void fetchSuggestionsFor(recording.id);
      setFeedback({ type: 'success', message: 'Recording processed. Review the AI clinical note below.' });
    } catch (error) {
      setIsTranscribing(false);
      setIsGenerating(false);
      refetch();
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Processing failed. You can retry from the AI Scribe tab.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, currentRecording, input.doctorId, recorder, refetch]);

  const retryProcessing = useCallback(async () => {
    const recording = currentRecording;
    if (!recording) return;
    setFeedback(null);
    try {
      setIsTranscribing(true);
      await transcribeConsultation({ recordingId: recording.id });
      setIsTranscribing(false);
      setIsGenerating(true);
      await generateClinicalNote({ recordingId: recording.id, outputLanguage: 'en' });
      setIsGenerating(false);
      refetch();
      void fetchSuggestionsFor(recording.id);
      setFeedback({ type: 'success', message: 'Recording processed. Review the AI clinical note below.' });
    } catch (error) {
      setIsTranscribing(false);
      setIsGenerating(false);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Processing failed. Please try again.',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRecording, refetch]);

  const discard = useCallback(async () => {
    const recording = currentRecording;
    setFeedback(null);
    if (recorder.status === 'recording' || recorder.status === 'paused') {
      await recorder.stop();
    }
    recorder.reset();
    if (recording) {
      try {
        await actions.discardRecording(recording);
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not discard the recording.',
        });
        return;
      }
    }
    setActiveRecording(null);
    setSuggestions([]);
    refetch();
    setFeedback({ type: 'success', message: 'Recording discarded.' });
  }, [actions, currentRecording, recorder, refetch]);

  const regenerate = useCallback(
    async (regenInput: ScribeRegenerateInput) => {
      const recording = currentRecording;
      if (!recording) return;
      setFeedback(null);
      setIsGenerating(true);
      try {
        await generateClinicalNote({
          recordingId: recording.id,
          promptTemplate: regenInput.promptTemplate,
          outputLanguage: regenInput.outputLanguage,
          customInstructions: regenInput.customInstructions,
          transcriptOverride: regenInput.transcriptOverride,
        });
        refetch();
        setFeedback({ type: 'success', message: 'Clinical note re-generated.' });
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Re-generation failed.',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [currentRecording, refetch]
  );

  const fetchSuggestionsFor = useCallback(async (recordingId: string) => {
    setIsLoadingSuggestions(true);
    try {
      const result = await extractSmartSuggestions({ recordingId });
      setSuggestions(result.suggestions);
    } catch {
      // Suggestions are non-critical; ignore failures silently.
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    const recording = currentRecording;
    if (!recording) return;
    await fetchSuggestionsFor(recording.id);
  }, [currentRecording, fetchSuggestionsFor]);

  const dismissSuggestion = useCallback((id: string) => {
    setDismissed((current) => new Set(current).add(id));
  }, []);

  const relabelSegments = useCallback(
    async (segments: TranscriptSegment[]) => {
      const transcript = data?.transcript ?? null;
      if (!transcript) return;
      try {
        await actions.updateTranscriptSegments(transcript.id, segments);
        refetch();
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not update the transcript.',
        });
      }
    },
    [actions, data?.transcript, refetch]
  );

  const markApproved = useCallback(async () => {
    const recording = currentRecording;
    const note = data?.note ?? null;
    if (!recording || !note || !input.doctorId) {
      return;
    }
    await actions.markNoteApproved({
      recordingId: recording.id,
      noteId: note.id,
      appointmentId: recording.appointment_id,
      doctorId: input.doctorId,
    });
    refetch();
  }, [actions, currentRecording, data?.note, input.doctorId, refetch]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !dismissed.has(suggestion.id)),
    [suggestions, dismissed]
  );

  return {
    recorder,
    data,
    loading,
    refetch,
    isProcessing,
    isTranscribing,
    isGenerating,
    isLoadingSuggestions,
    feedback,
    setFeedback,
    consentOpen,
    openConsent,
    closeConsent,
    startWithConsent,
    stopAndProcess,
    retryProcessing,
    discard,
    regenerate,
    suggestions: visibleSuggestions,
    fetchSuggestions,
    dismissSuggestion,
    markApproved,
    relabelSegments,
  };
}
