import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, HelpCircle, Info, Loader2, Radio, X } from 'lucide-react';
import type { LiveCueKind } from '../../types';
import type { ConsultationScribeController } from '../../hooks/use-consultation-scribe-controller';

interface LiveSessionPanelProps {
  controller: ConsultationScribeController;
}

const cueIcon = (kind: LiveCueKind) => {
  if (kind === 'red_flag') return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (kind === 'question') return <HelpCircle className="h-4 w-4 text-blue-600" />;
  return <Info className="h-4 w-4 text-slate-500" />;
};

const cueAccent = (kind: LiveCueKind) => {
  if (kind === 'red_flag') return 'border-red-200 bg-red-50';
  if (kind === 'question') return 'border-blue-200 bg-blue-50';
  return 'border-slate-200 bg-slate-50';
};

/**
 * Visible only during a live session. Shows the near-real-time transcript and
 * the AI copilot cues (questions / red flags / history reminders).
 */
export function LiveSessionPanel({ controller }: LiveSessionPanelProps) {
  const { t } = useTranslation('common');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isLive = controller.recorder.status === 'recording' || controller.recorder.status === 'paused';
  const show = controller.mode === 'live' && isLive;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [controller.liveEntries.length]);

  if (!show) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="h-4 w-4 animate-pulse text-red-600" />
        <h3 className="text-base font-bold text-slate-900">{t('doctor.consultationScribe.live.title')}</h3>
        {controller.liveTranscribing ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('doctor.consultationScribe.live.listening')}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Live transcript */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('doctor.consultationScribe.live.transcript')}
          </p>
          <div
            ref={scrollRef}
            className="max-h-64 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"
          >
            {controller.liveEntries.length === 0 ? (
              <p className="text-slate-400">{t('doctor.consultationScribe.live.waiting')}</p>
            ) : (
              controller.liveEntries.map((entry) => <p key={entry.id}>{entry.text}</p>)
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{t('doctor.consultationScribe.live.diarizationNote')}</p>
        </div>

        {/* Live cues */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('doctor.consultationScribe.live.cues')}
          </p>
          {controller.liveCues.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
              {t('doctor.consultationScribe.live.cuesEmpty')}
            </p>
          ) : (
            <div className="space-y-2">
              {controller.liveCues.map((cue) => (
                <div
                  key={cue.id}
                  className={`flex items-start justify-between gap-2 rounded-2xl border px-3 py-2 ${cueAccent(cue.kind)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{cueIcon(cue.kind)}</span>
                    <p className="text-sm text-slate-800">{cue.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => controller.dismissCue(cue.id)}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-white/60"
                    aria-label={t('doctor.consultationScribe.live.dismiss')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
