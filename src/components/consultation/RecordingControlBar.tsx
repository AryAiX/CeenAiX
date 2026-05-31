import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Circle, Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from 'lucide-react';
import { formatRecordingDuration } from '../../lib/consultation-scribe';
import type { ConsultationScribeController } from '../../hooks/use-consultation-scribe-controller';
import { WaveformVisualizer } from './WaveformVisualizer';

interface RecordingControlBarProps {
  controller: ConsultationScribeController;
  patientName: string;
}

export function RecordingControlBar({ controller, patientName }: RecordingControlBarProps) {
  const { t } = useTranslation('common');
  const { recorder } = controller;

  const isLive = recorder.status === 'recording' || recorder.status === 'paused';
  const recordingStatus = controller.data?.recording?.status ?? null;
  const isProcessing =
    controller.isProcessing || (recordingStatus === 'processing' && !isLive);
  const isReady = !isLive && !isProcessing && recordingStatus === 'ready';
  const isApproved = !isLive && !isProcessing && recordingStatus === 'approved';
  const showStart = !isLive && !isProcessing;

  // Keep recording visible even when the doctor switches browser tabs, and warn
  // before an accidental refresh would lose the in-progress capture.
  useEffect(() => {
    if (!isLive) return;
    const previousTitle = document.title;
    document.title = `🔴 ${t('doctor.consultationScribe.controlBar.recording')} — ${patientName}`;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.title = previousTitle;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLive, patientName, t]);

  const statusLabel = (() => {
    if (recorder.status === 'recording') return t('doctor.consultationScribe.controlBar.recording');
    if (recorder.status === 'paused') return t('doctor.consultationScribe.controlBar.paused');
    if (isProcessing) return t('doctor.consultationScribe.controlBar.processing');
    if (isApproved) return t('doctor.consultationScribe.controlBar.approved');
    if (isReady) return t('doctor.consultationScribe.controlBar.ready');
    return t('doctor.consultationScribe.controlBar.idle');
  })();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isLive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{t('doctor.consultationScribe.controlBar.title')}</p>
            <div className="mt-0.5 flex items-center gap-2">
              {recorder.status === 'recording' ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
              ) : recorder.status === 'paused' ? (
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
              ) : null}
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isLive ? 'text-red-600' : isApproved ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {statusLabel}
              </span>
              {isLive ? (
                <span className="font-['DM_Mono'] text-sm font-medium text-slate-900" aria-live="polite">
                  {formatRecordingDuration(recorder.elapsedSeconds)}
                </span>
              ) : null}
            </div>
          </div>
          {isLive ? <WaveformVisualizer stream={recorder.stream} active={recorder.status === 'recording'} /> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!recorder.isSupported ? (
            <p className="text-xs text-amber-600">{t('doctor.consultationScribe.controlBar.notSupported')}</p>
          ) : null}

          {showStart && recorder.isSupported ? (
            <>
              {recorder.devices.length > 1 ? (
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-600">
                  <Mic className="h-3.5 w-3.5" />
                  <span className="sr-only">{t('doctor.consultationScribe.controlBar.micLabel')}</span>
                  <select
                    value={recorder.selectedDeviceId ?? ''}
                    onChange={(event) => recorder.selectDevice(event.target.value)}
                    className="max-w-[140px] bg-transparent text-xs outline-none"
                  >
                    {recorder.devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void recorder.refreshDevices();
                  controller.openConsent();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Circle className="h-4 w-4 fill-current" />
                <span>
                  {isReady || isApproved
                    ? t('doctor.consultationScribe.controlBar.startNew')
                    : t('doctor.consultationScribe.controlBar.start')}
                </span>
              </button>
            </>
          ) : null}

          {recorder.status === 'recording' ? (
            <button
              type="button"
              onClick={recorder.pause}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pause className="h-4 w-4" />
              <span>{t('doctor.consultationScribe.controlBar.pause')}</span>
            </button>
          ) : null}

          {recorder.status === 'paused' ? (
            <button
              type="button"
              onClick={recorder.resume}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Play className="h-4 w-4" />
              <span>{t('doctor.consultationScribe.controlBar.resume')}</span>
            </button>
          ) : null}

          {isLive ? (
            <>
              <button
                type="button"
                onClick={() => void controller.stopAndProcess()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Square className="h-4 w-4" />
                <span>{t('doctor.consultationScribe.controlBar.stop')}</span>
              </button>
              <button
                type="button"
                onClick={() => void controller.discard()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('doctor.consultationScribe.controlBar.discard')}</span>
              </button>
            </>
          ) : null}

          {isProcessing ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('doctor.consultationScribe.controlBar.processing')}
            </span>
          ) : null}
        </div>
      </div>

      {recorder.error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {recorder.error}
        </p>
      ) : null}
    </section>
  );
}
