import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { ConsultationTranscript, TranscriptSegment, TranscriptSpeaker } from '../../types';
import { formatRecordingDuration } from '../../lib/consultation-scribe';

interface TranscriptPanelProps {
  transcript: ConsultationTranscript | null;
  isTranscribing: boolean;
  onSegmentsChange?: (segments: TranscriptSegment[]) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;

const nextSpeaker = (speaker: TranscriptSpeaker): TranscriptSpeaker => {
  if (speaker === 'doctor') return 'patient';
  if (speaker === 'patient') return 'unknown';
  return 'doctor';
};

export function TranscriptPanel({ transcript, isTranscribing, onSegmentsChange }: TranscriptPanelProps) {
  const { t } = useTranslation('common');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const segments = transcript?.segments ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments.length]);

  const speakerLabel = (speaker: TranscriptSpeaker) => {
    if (speaker === 'doctor') return t('doctor.consultationScribe.transcript.speakerDoctor');
    if (speaker === 'patient') return t('doctor.consultationScribe.transcript.speakerPatient');
    return t('doctor.consultationScribe.transcript.speakerUnknown');
  };

  const handleRelabel = (index: number) => {
    if (!onSegmentsChange) return;
    const updated = segments.map((segment, segmentIndex) =>
      segmentIndex === index ? { ...segment, speaker: nextSpeaker(segment.speaker) } : segment
    );
    onSegmentsChange(updated);
  };

  if (isTranscribing) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <p>{t('doctor.consultationScribe.transcript.transcribing')}</p>
      </div>
    );
  }

  if (!transcript || segments.length === 0) {
    if (transcript?.full_text) {
      return (
        <div ref={scrollRef} className="max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {transcript.full_text}
        </div>
      );
    }
    return (
      <p className="text-sm text-slate-500">{t('doctor.consultationScribe.transcript.empty')}</p>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {segments.map((segment, index) => {
        const lowConfidence = segment.confidence < LOW_CONFIDENCE_THRESHOLD;
        const speakerColor =
          segment.speaker === 'doctor'
            ? 'bg-blue-100 text-blue-700'
            : segment.speaker === 'patient'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600';
        return (
          <div key={`${segment.start_ms}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="mb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRelabel(index)}
                title={t('doctor.consultationScribe.transcript.relabel')}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition hover:opacity-80 ${speakerColor}`}
              >
                {speakerLabel(segment.speaker)}
              </button>
              <span className="font-['DM_Mono'] text-[10px] text-slate-400">
                {formatRecordingDuration(Math.round(segment.start_ms / 1000))}
              </span>
              {lowConfidence ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {t('doctor.consultationScribe.transcript.lowConfidence')}
                </span>
              ) : null}
            </div>
            <p className={`text-sm leading-6 ${lowConfidence ? 'text-amber-900' : 'text-slate-700'}`}>
              {segment.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
