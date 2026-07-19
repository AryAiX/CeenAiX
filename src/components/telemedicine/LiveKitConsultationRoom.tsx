import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Calendar, Clock, Loader2, ShieldCheck, Video, VideoOff } from 'lucide-react';
import type { Appointment } from '../../types';
import {
  getTelemedicineJoinWindowStatus,
  requestTelemedicineToken,
  type TelemedicineRole,
  type TelemedicineTokenResponse,
} from '../../lib/telemedicine';
import { dateTimeFormatWithNumerals, resolveLocale } from '../../lib/i18n-ui';

const LiveKitStage = lazy(() => import('./LiveKitStage'));

interface LiveKitConsultationRoomProps {
  role: TelemedicineRole;
  appointment: Appointment;
  participantName: string;
  counterpartName: string;
  onBack: () => void;
}

const statusMessage = (status: ReturnType<typeof getTelemedicineJoinWindowStatus>, role: TelemedicineRole) => {
  switch (status) {
    case 'open':
      return role === 'doctor'
        ? 'You can enter the video room and admit the patient when they join.'
        : 'You can enter the secure video room now.';
    case 'too_early':
      return 'The video room opens 10 minutes before the appointment time.';
    case 'ended':
      return 'This video visit window has ended.';
    case 'not_virtual':
      return 'This appointment is not marked as a telemedicine visit.';
    case 'inactive':
    default:
      return 'This appointment is not currently eligible for a video session.';
  }
};

export function LiveKitConsultationRoom({
  role,
  appointment,
  participantName,
  counterpartName,
  onBack,
}: LiveKitConsultationRoomProps) {
  const { i18n } = useTranslation('common');
  const [session, setSession] = useState<TelemedicineTokenResponse | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const scheduledAt = useMemo(() => new Date(appointment.scheduled_at), [appointment.scheduled_at]);
  const locale = resolveLocale(i18n.language);
  const dateLabel = scheduledAt.toLocaleDateString(
    locale,
    dateTimeFormatWithNumerals(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  );
  const timeLabel = scheduledAt.toLocaleTimeString(
    locale,
    dateTimeFormatWithNumerals(i18n.language, { hour: 'numeric', minute: '2-digit' })
  );
  const joinStatus = getTelemedicineJoinWindowStatus(appointment);
  const canJoin = joinStatus === 'open';

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setJoinError(null);
    try {
      setSession(await requestTelemedicineToken(appointment.id));
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Unable to start the video session.');
    } finally {
      setJoining(false);
    }
  };

  if (session) {
    return (
      <div className="min-h-[calc(100vh-8rem)] rounded-3xl border border-slate-200 bg-slate-950 p-3 shadow-sm">
        <Suspense
          fallback={
            <div className="flex min-h-[calc(100vh-9.5rem)] items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading secure video room...
            </div>
          }
        >
          <LiveKitStage
            session={session}
            onDisconnected={() => setSession(null)}
            onError={(message) => setJoinError(message)}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        <span>Back to appointment</span>
      </button>

      <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-950 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-100">
                Secure telemedicine
              </p>
              <h1 className="mt-3 text-3xl font-bold">Video consultation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-50">
                {role === 'doctor'
                  ? `Start the encrypted LiveKit room for ${counterpartName}.`
                  : `Join your encrypted LiveKit room with ${counterpartName}.`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">Room status</p>
              <p className="mt-2 text-sm font-semibold text-white">{statusMessage(joinStatus, role)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <Calendar className="h-5 w-5 text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
            <p className="mt-1 font-bold text-slate-900">{dateLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <Clock className="h-5 w-5 text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
            <p className="mt-1 font-bold text-slate-900">
              {timeLabel} · {appointment.duration_minutes} min
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in as</p>
            <p className="mt-1 font-bold text-slate-900">{participantName}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 p-6 sm:p-8">
          {joinError ? (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{joinError}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Camera and microphone permissions are requested only after you join.
            </div>
            <button
              type="button"
              disabled={!canJoin || joining}
              onClick={handleJoin}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                canJoin ? 'bg-violet-700 hover:bg-violet-800' : 'bg-slate-400'
              }`}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : canJoin ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              <span>{joining ? 'Preparing secure room...' : canJoin ? 'Join video session' : 'Video room unavailable'}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
