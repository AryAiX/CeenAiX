import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Circle, Loader2, Mic, Pause, Play, Sparkles, Square, Trash2 } from 'lucide-react';
import {
  DEFAULT_SPEAKER_CHANNEL_MAP,
  formatRecordingDuration,
  preferenceToSpeakerChannelMap,
} from '../../lib/consultation-scribe';
import type { ConsultationScribeController } from '../../hooks/use-consultation-scribe-controller';
import type { AudioChannelDetectionReason } from '../../hooks/use-audio-recorder';
import type { AudioInputChannel } from '../../types';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ConsentModal } from './ConsentModal';

interface RecordingControlBarProps {
  controller: ConsultationScribeController;
  patientName: string;
}

type SetupStep = 'doctor-speak' | 'patient-speak' | 'confirm';
type SetupSpeaker = 'doctor' | 'patient';
type SetupFallbackReason = AudioChannelDetectionReason | 'same-channel';
type SetupInputDiagnostic =
  | { status: 'stereo-separated'; channelCount: number | null }
  | { status: 'one-combined-channel'; channelCount: number | null }
  | { status: 'separation-unclear'; channelCount: number | null };

const oppositeChannel = (channel: AudioInputChannel): AudioInputChannel => (channel === 'left' ? 'right' : 'left');

const getFallbackDiagnostic = (
  reason: SetupFallbackReason,
  channelCount: number | null
): SetupInputDiagnostic => {
  if (reason === 'mono') {
    return { status: 'one-combined-channel', channelCount };
  }
  return { status: 'separation-unclear', channelCount };
};

export function RecordingControlBar({ controller, patientName }: RecordingControlBarProps) {
  const { t } = useTranslation('common');
  const { recorder } = controller;
  const { prepareSetupInput, stopSetupInput } = recorder;
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('doctor-speak');
  const [setupDoctorFallbackReason, setSetupDoctorFallbackReason] = useState<SetupFallbackReason | null>(null);
  const [setupPatientFallbackReason, setSetupPatientFallbackReason] = useState<SetupFallbackReason | null>(null);
  const [setupDoctorChannel, setSetupDoctorChannel] = useState<AudioInputChannel | null>(null);
  const [setupSamplingSpeaker, setSetupSamplingSpeaker] = useState<SetupSpeaker | null>(null);
  const [setupInputDiagnostic, setSetupInputDiagnostic] = useState<SetupInputDiagnostic | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);

  const isLive = recorder.status === 'recording' || recorder.status === 'paused';
  const recordingStatus = controller.data?.recording?.status ?? null;
  const isProcessing =
    controller.isProcessing || (recordingStatus === 'processing' && !isLive);
  const isReady = !isLive && !isProcessing && recordingStatus === 'ready';
  const isApproved = !isLive && !isProcessing && recordingStatus === 'approved';
  const showStart = !isLive && !isProcessing;
  const monoDetected = recorder.channelCount !== null && recorder.channelCount < 2;
  const setupSteps: SetupStep[] = ['doctor-speak', 'patient-speak', 'confirm'];
  const currentStepIndex = setupSteps.indexOf(setupStep);
  const fallbackActive =
    setupStep === 'confirm' && (setupDoctorFallbackReason !== null || setupPatientFallbackReason !== null);
  const setupSourceStatusLabel = (() => {
    if (setupSamplingSpeaker === 'doctor') {
      return t('doctor.consultationScribe.controlBar.checkingDoctor');
    }
    if (setupSamplingSpeaker === 'patient') {
      return t('doctor.consultationScribe.controlBar.checkingPatient');
    }
    if (setupStep === 'confirm' && setupInputDiagnostic?.status === 'stereo-separated') {
      return t('doctor.consultationScribe.controlBar.sourceAssignedSeparated');
    }
    if (setupStep === 'confirm' && fallbackActive) {
      return t('doctor.consultationScribe.controlBar.sourceAssignedVoiceContext');
    }
    if (setupStep === 'patient-speak' && setupDoctorChannel) {
      return t('doctor.consultationScribe.controlBar.doctorSourceAssignedLabel');
    }
    if (setupStep === 'patient-speak' && setupDoctorFallbackReason) {
      return t('doctor.consultationScribe.controlBar.doctorSourceSampledLabel');
    }
    if (setupStep === 'confirm') {
      return t('doctor.consultationScribe.controlBar.sourceAssignmentCompleteLabel');
    }
    if (setupStep === 'patient-speak') {
      return null;
    }
    return t('doctor.consultationScribe.controlBar.sourceUnknownHint');
  })();

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

  useEffect(() => {
    if (isLive || isProcessing) {
      setSetupOpen(false);
    }
  }, [isLive, isProcessing]);

  useEffect(() => {
    if (!setupOpen) return undefined;
    void prepareSetupInput();
    return () => {
      stopSetupInput();
    };
  }, [prepareSetupInput, setupOpen, stopSetupInput]);

  const statusLabel = (() => {
    if (recorder.status === 'recording') return t('doctor.consultationScribe.controlBar.recording');
    if (recorder.status === 'paused') return t('doctor.consultationScribe.controlBar.paused');
    if (isProcessing) return t('doctor.consultationScribe.controlBar.processing');
    if (isApproved) return t('doctor.consultationScribe.controlBar.approved');
    if (isReady) return t('doctor.consultationScribe.controlBar.ready');
    return t('doctor.consultationScribe.controlBar.idle');
  })();

  const beginSetup = useCallback(() => {
    void recorder.refreshDevices();
    setSetupDoctorFallbackReason(null);
    setSetupPatientFallbackReason(null);
    setSetupDoctorChannel(null);
    setSetupSamplingSpeaker(null);
    setSetupInputDiagnostic(null);
    controller.setScribeInputMode('voice_context');
    setSetupStep('doctor-speak');
    setSetupOpen(true);
  }, [controller, recorder]);

  const startSetup = () => {
    beginSetup();
  };

  const handleDoctorSpoke = async () => {
    setSetupSamplingSpeaker('doctor');
    try {
      const [result, sample] = await Promise.all([
        recorder.sampleInputChannels(),
        recorder.recordSetupSample(),
      ]);
      if (sample) {
        controller.setSpeakerReferenceSample('doctor', sample);
      }
      if (result.status === 'detected') {
        controller.setSpeakerChannelMap(
          result.activeChannel === 'left'
            ? preferenceToSpeakerChannelMap('left-doctor')
            : preferenceToSpeakerChannelMap('left-patient')
        );
        setSetupDoctorChannel(result.activeChannel);
        setSetupDoctorFallbackReason(null);
        setSetupPatientFallbackReason(null);
        setSetupInputDiagnostic(null);
        setSetupStep('patient-speak');
      } else if (result.reason !== 'microphone-error') {
        controller.setSpeakerChannelMap(DEFAULT_SPEAKER_CHANNEL_MAP);
        setSetupDoctorChannel(null);
        setSetupDoctorFallbackReason(result.reason);
        setSetupPatientFallbackReason(null);
        setSetupInputDiagnostic(null);
        controller.setScribeInputMode('voice_context');
        setSetupStep('patient-speak');
      }
    } finally {
      setSetupSamplingSpeaker(null);
    }
  };

  const handlePatientSpoke = async () => {
    setSetupSamplingSpeaker('patient');
    try {
      const [result, sample] = await Promise.all([
        recorder.sampleInputChannels(),
        recorder.recordSetupSample(),
      ]);
      if (sample) {
        controller.setSpeakerReferenceSample('patient', sample);
      }
      if (result.status === 'fallback' && result.reason === 'microphone-error') {
        return;
      }
      if (setupDoctorFallbackReason) {
        const fallbackReason = result.status === 'fallback' ? result.reason : setupDoctorFallbackReason;
        controller.setSpeakerChannelMap(DEFAULT_SPEAKER_CHANNEL_MAP);
        setSetupDoctorChannel(null);
        setSetupPatientFallbackReason(fallbackReason);
        setSetupInputDiagnostic(getFallbackDiagnostic(fallbackReason, result.channelCount));
      } else if (result.status === 'detected' && setupDoctorChannel && result.activeChannel !== setupDoctorChannel) {
        const nextDoctorChannel = oppositeChannel(result.activeChannel);
        controller.setSpeakerChannelMap(
          result.activeChannel === 'left'
            ? preferenceToSpeakerChannelMap('left-patient')
            : preferenceToSpeakerChannelMap('left-doctor')
        );
        setSetupDoctorChannel(nextDoctorChannel);
        setSetupDoctorFallbackReason(null);
        setSetupPatientFallbackReason(null);
        setSetupInputDiagnostic({ status: 'stereo-separated', channelCount: result.channelCount });
        controller.setScribeInputMode('stereo_separated');
      } else {
        const fallbackReason = result.status === 'fallback' ? result.reason : 'same-channel';
        controller.setSpeakerChannelMap(DEFAULT_SPEAKER_CHANNEL_MAP);
        setSetupDoctorChannel(null);
        setSetupPatientFallbackReason(fallbackReason);
        setSetupInputDiagnostic(getFallbackDiagnostic(fallbackReason, result.channelCount));
        controller.setScribeInputMode('voice_context');
      }
      setSetupStep('confirm');
    } finally {
      setSetupSamplingSpeaker(null);
    }
  };

  const requestRecordingConsent = () => {
    void recorder.refreshDevices();
    stopSetupInput();
    setSetupOpen(false);
    setConsentOpen(true);
  };

  const goBack = () => {
    const previousStep = setupSteps[Math.max(currentStepIndex - 1, 0)];
    setSetupStep(previousStep);
  };

  const renderSetupStep = () => {
    if (setupStep === 'doctor-speak') {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {t('doctor.consultationScribe.controlBar.stepDoctorTitle')}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t('doctor.consultationScribe.controlBar.stepDoctorBody')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDoctorSpoke()}
            disabled={setupSamplingSpeaker !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {setupSamplingSpeaker === 'doctor' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {setupSamplingSpeaker === 'doctor'
              ? t('doctor.consultationScribe.controlBar.checkingAction')
              : t('doctor.consultationScribe.controlBar.stepDoctorAction')}
          </button>
        </div>
      );
    }

    if (setupStep === 'patient-speak') {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {t('doctor.consultationScribe.controlBar.stepPatientTitle', { name: patientName })}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t('doctor.consultationScribe.controlBar.stepPatientBody', { name: patientName })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handlePatientSpoke()}
            disabled={setupSamplingSpeaker !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {setupSamplingSpeaker === 'patient' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {setupSamplingSpeaker === 'patient'
              ? t('doctor.consultationScribe.controlBar.checkingAction')
              : t('doctor.consultationScribe.controlBar.stepPatientAction')}
          </button>
        </div>
      );
    }

    const stereoConfirmed = setupInputDiagnostic?.status === 'stereo-separated' && !fallbackActive;

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {t('doctor.consultationScribe.controlBar.confirmTitle')}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {stereoConfirmed
              ? t('doctor.consultationScribe.controlBar.confirmStereoBody')
              : t('doctor.consultationScribe.controlBar.confirmVoiceContextBody')}
          </p>
        </div>
        {stereoConfirmed ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                {t('doctor.consultationScribe.controlBar.doctorSourceLabel')}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {t('doctor.consultationScribe.controlBar.doctorSourceValue')}
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {t('doctor.consultationScribe.controlBar.patientSourceLabel')}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {t('doctor.consultationScribe.controlBar.patientSourceValue')}
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestRecordingConsent}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <Circle className="h-4 w-4 fill-current" />
            {controller.mode === 'live'
              ? t('doctor.consultationScribe.controlBar.startLive')
              : t('doctor.consultationScribe.controlBar.start')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSetupDoctorFallbackReason(null);
              setSetupPatientFallbackReason(null);
              setSetupDoctorChannel(null);
              setSetupInputDiagnostic(null);
              controller.setScribeInputMode('voice_context');
              setSetupStep('doctor-speak');
            }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {t('doctor.consultationScribe.controlBar.restartSetup')}
          </button>
        </div>
      </div>
    );
  };

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

      {showStart && recorder.isSupported ? (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {t('doctor.consultationScribe.controlBar.setupTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t('doctor.consultationScribe.controlBar.setupBody')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-[260px]">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5" role="group" aria-label={t('doctor.consultationScribe.controlBar.modeLabel')}>
                {(['recorded', 'live'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => controller.setMode(m)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      controller.mode === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {m === 'recorded'
                      ? t('doctor.consultationScribe.controlBar.modeRecord')
                      : t('doctor.consultationScribe.controlBar.modeLive')}
                  </button>
                ))}
              </div>
              {recorder.devices.length > 1 ? (
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  <Mic className="h-3.5 w-3.5" />
                  <span>{t('doctor.consultationScribe.controlBar.micLabel')}</span>
                  <select
                    value={recorder.selectedDeviceId ?? ''}
                    onChange={(event) => recorder.selectDevice(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
                  >
                    {recorder.devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          {!setupOpen ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {t('doctor.consultationScribe.controlBar.readySetupTitle')}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {t('doctor.consultationScribe.controlBar.readySetupBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={startSetup}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Circle className="h-4 w-4 fill-current" />
                <span>
                  {isReady || isApproved
                    ? t('doctor.consultationScribe.controlBar.startNewVoiceSetup')
                    : t('doctor.consultationScribe.controlBar.startVoiceSetup')}
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t('doctor.consultationScribe.controlBar.wizardLabel', {
                      current: currentStepIndex + 1,
                      total: setupSteps.length,
                    })}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {t('doctor.consultationScribe.controlBar.wizardTitle')}
                  </p>
                </div>
                <div className="flex items-center gap-1" aria-hidden="true">
                  {setupSteps.map((step, index) => (
                    <span
                      key={step}
                      className={`h-2 rounded-full transition-all ${
                        index <= currentStepIndex ? 'w-7 bg-blue-600' : 'w-2 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {setupSourceStatusLabel ? (
                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600" aria-live="polite">
                  {setupSourceStatusLabel}
                </div>
              ) : null}

              {renderSetupStep()}

              {currentStepIndex > 0 && setupStep !== 'confirm' ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                >
                  {t('doctor.consultationScribe.controlBar.back')}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {(monoDetected || (recorder.channelCount !== null && !controller.stereoInputAvailable)) && isLive ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{t('doctor.consultationScribe.controlBar.monoWarning')}</span>
        </p>
      ) : null}

      {recorder.error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {recorder.error}
        </p>
      ) : null}
      <ConsentModal
        open={consentOpen}
        patientName={patientName}
        onClose={() => setConsentOpen(false)}
        onConfirm={(consent) => {
          setConsentOpen(false);
          void controller.startRecording(consent);
        }}
      />
    </section>
  );
}
