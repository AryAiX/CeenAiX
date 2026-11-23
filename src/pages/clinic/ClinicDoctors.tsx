import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { createPortal } from 'react-dom';
import { clinicDayRangeUtc, clinicTodayKey, formatClinicDate, formatClinicTime } from '../../lib/clinic-booking-time';
import { fetchAllPages, fetchByIdChunks } from '../../lib/supabase-batches';
import { fetchClinicPatientProfiles } from '../../lib/clinic-patients';
import { clinicDoctorActions, clinicDoctorStatus } from '../../lib/clinic-doctor-status';
import { parseFeeInput } from '../../lib/clinic-visit-fee';
import { formatLocaleCurrency, formatLocaleDecimal, formatLocaleDigits, formatLocalePhoneDisplay, resolveLocale } from '../../lib/i18n-ui';
import { Search, Plus, CheckCircle, Clock, AlertCircle, X, Save, Stethoscope, Phone, Mail, Calendar, Star, MoreVertical, Pencil as Edit2, Trash2, Eye, XCircle, MessageSquare } from 'lucide-react';

interface Doctor {
  id: string;
  doctorUserId: string;
  name: string;
  specialty: string;
  dhaLicense: string;
  phone: string;
  email: string;
  status: 'active' | 'pending' | 'invited' | 'declined' | 'inactive' | 'suspended';
  initials: string;
  gradient: string;
  /** created_at of the link (shown as "Joined <month year>") */
  joinedAt: string | null;
  todayAppts: number;
  totalAppts: number;
  rating: number;
  /** Clinic fee, else the doctor's own fee; null when neither is set (shown as "—"). */
  consultationFee: number | null;
  /** The clinic's own fees for this doctor (null = not set); edited in the Edit Fee popup (QA-205). */
  clinicFees: { consultation: number | null; telemedicine: number | null; followUp: number | null };
  /** day = 0 (Sunday) .. 6 */
  weeklyAvailability: { day: number; start: string; end: string }[];
  upcomingBlockedSlots: { date: string; start: string; end: string; reason: string | null }[];
  dhaVerified: boolean;
}

const gradients = [
  'from-teal-600 to-blue-600',
  'from-blue-600 to-blue-700',
  'from-emerald-600 to-teal-600',
  'from-slate-600 to-slate-700',
  'from-amber-600 to-amber-700',
  'from-rose-500 to-rose-600',
];

const statusConfig = {
  active:    { color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending:   { color: 'bg-amber-100 text-amber-700 border-amber-200' },
  invited:   { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  declined:  { color: 'bg-slate-100 text-slate-500 border-slate-200' },
  inactive:  { color: 'bg-slate-100 text-slate-600 border-slate-200' },
  suspended: { color: 'bg-red-100 text-red-700 border-red-200' },
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** QA-207: "09:00:00" -> "09:00" in the UI digits */
const timeLabel = (value: string, language: string) => formatLocalePhoneDisplay(value.slice(0, 5), language);

const monthYear = (iso: string, language: string) =>
  new Intl.DateTimeFormat(resolveLocale(language), {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dubai',
    ...(language.startsWith('ar') ? { numberingSystem: 'arab' } : {}),
  }).format(new Date(iso));

const doctorName = (t: TFunction, name: string | null | undefined) => name || t('clinic.appointments.unknownDoctor');
const specialtyLabel = (t: TFunction, specialty: string | null | undefined) => specialty || t('clinic.appointments.generalPractice');

/** QA-199: every clinic change to a doctor's link goes through clinic_doctor_link_action. */
export type ClinicDoctorLinkAction = 'invite' | 'cancel_invite' | 'reject' | 'suspend' | 'reactivate' | 'remove';

const runDoctorLinkAction = async (doctorUserId: string, action: ClinicDoctorLinkAction): Promise<string> => {
  const { data, error } = await supabase.rpc('clinic_doctor_link_action', {
    p_doctor_user_id: doctorUserId,
    p_action: action,
  });
  if (error) throw error;
  return data as string;
};

/** Plain message key for a refused doctor-link change (never the raw database text). */
const doctorLinkErrorKey = (err: unknown): string => {
  const code = (err as { code?: string } | null)?.code;
  if (code === '22023') return 'clinic.doctorsPage.errors.noLongerPossible';
  if (code === '42501') return 'clinic.doctorsPage.errors.notAllowed';
  if (code === 'P0002') return 'clinic.doctorsPage.errors.notFound';
  return 'clinic.doctorsPage.errors.generic';
};

function AddDoctorModal({ onClose, existingDoctorIds, onInvited }: {
  onClose: () => void;
  /** Doctors already linked to the clinic (a declined invitation can be sent again, QA-204). */
  existingDoctorIds: string[];
  onInvited: (doctorName: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ userId: string; name: string; specialty: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const searchDoctors = async (query: string) => {
    setSearch(query);
    setInviteError(null);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    // QA-202: names and specialties only (no email, phone or identity data of other doctors)
    const { data, error } = await supabase.rpc('clinic_search_doctors', { p_query: query });
    if (error) {
      setResults([]);
      setInviteError(doctorLinkErrorKey(error));
      setSearching(false);
      return;
    }
    const rows = (data ?? []) as { user_id: string; full_name: string | null; specialization: string | null }[];
    setResults(rows.map(d => ({
      userId: d.user_id,
      name: doctorName(t, d.full_name),
      specialty: specialtyLabel(t, d.specialization),
    })));
    setSearching(false);
  };

  const handleInvite = async (doctorUserId: string) => {
    setInvitingId(doctorUserId);
    setInviteError(null);
    try {
      // QA-199: one database call creates / re-opens the invitation and notifies the doctor
      await runDoctorLinkAction(doctorUserId, 'invite');
      const invitedDoc = results.find(r => r.userId === doctorUserId);
      onInvited(invitedDoc?.name ?? doctorName(t, null));
    } catch (err) {
      setInviteError(doctorLinkErrorKey(err));
    } finally {
      setInvitingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="invite-doctor-title" dir={i18n.dir()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center"><Stethoscope size={18} className="text-teal-600" aria-hidden="true" /></div>
            <h3 id="invite-doctor-title" className="font-bold text-slate-900">{t('clinic.doctorsPage.invite.title')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('clinic.doctorsPage.invite.close')} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search size={15} aria-hidden="true" className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => void searchDoctors(e.target.value)}
              placeholder={t('clinic.doctorsPage.invite.searchPlaceholder')}
              aria-label={t('clinic.doctorsPage.invite.searchLabel')}
              className="w-full ps-9 pe-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {inviteError && <p role="alert" className="text-xs text-red-500">{t(inviteError)}</p>}
          {searching && <p className="text-xs text-slate-400">{t('clinic.doctorsPage.invite.searching')}</p>}

          {results.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {results.map(d => {
                const alreadyInClinic = existingDoctorIds.includes(d.userId);
                return (
                  <div key={d.userId} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                        <Stethoscope size={14} className="text-teal-600" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                        <div className="text-xs text-slate-400">{d.specialty}</div>
                      </div>
                    </div>
                    {alreadyInClinic ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                        {t('clinic.doctorsPage.invite.alreadyInClinic')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleInvite(d.userId)}
                        disabled={invitingId === d.userId}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {invitingId === d.userId ? t('clinic.doctorsPage.invite.sending') : t('clinic.doctorsPage.invite.invite')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {search.length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-slate-400">{t('clinic.doctorsPage.invite.noResults', { query: search })}</p>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">{t('clinic.doctorsPage.invite.close')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DoctorDetailDrawer({ doctor, onClose, onApprove, onReject, onSuspend, onReactivate }: { doctor: Doctor; onClose: () => void; onApprove?: () => void; onReject?: () => void; onSuspend?: () => void; onReactivate?: () => void }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="doctor-profile-title" dir={i18n.dir()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 id="doctor-profile-title" className="font-bold text-slate-900">{t('clinic.doctorsPage.profile.title')}</h3>
          <button type="button" onClick={onClose} aria-label={t('clinic.doctorsPage.profile.close')} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" aria-hidden="true" /></button>
        </div>

        <div className="p-6">
          {/* Hero */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${doctor.gradient} flex items-center justify-center text-white font-bold text-xl shrink-0`}>
              {doctor.initials}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">{doctor.name}</div>
              <div className="text-slate-500 text-sm">{doctor.specialty}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig[doctor.status].color}`}>{t(`clinic.doctorsPage.status.${doctor.status}`)}</span>
                {doctor.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Star size={12} fill="currentColor" aria-hidden="true" /> {formatLocaleDecimal(doctor.rating, lang, 1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: t('clinic.doctorsPage.profile.statToday'), value: formatLocaleDigits(doctor.todayAppts, lang) },
              { label: t('clinic.doctorsPage.profile.statTotal'), value: formatLocaleDigits(doctor.totalAppts, lang) },
              { label: t('clinic.doctorsPage.profile.statFee'), value: doctor.consultationFee == null ? '—' : formatLocaleCurrency(doctor.consultationFee, lang) },
            ].map(s => (
              <div key={s.label} className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Send Message */}
          <button
            type="button"
            onClick={() => navigate(`/clinic/messages?doctor=${doctor.doctorUserId}`)}
            className="w-full mb-6 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare size={15} aria-hidden="true" /> {t('clinic.doctorsPage.profile.sendMessage')}
          </button>

          {/* Two-column main content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-5">
              {/* License */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('clinic.doctorsPage.profile.licence')}</div>
                <div className="font-mono text-sm text-slate-800" dir="ltr">{doctor.dhaLicense}</div>
                {/* QA-201: the real DHA verification, not the clinic link status */}
                <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${doctor.dhaVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {doctor.dhaVerified ? <CheckCircle size={12} aria-hidden="true" /> : <AlertCircle size={12} aria-hidden="true" />}
                  {doctor.dhaVerified ? t('clinic.doctorsPage.verifiedLong') : t('clinic.doctorsPage.notVerifiedLong')}
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                {[
                  { key: 'phone', icon: Phone, label: t('clinic.doctorsPage.profile.phone'), value: formatLocalePhoneDisplay(doctor.phone, lang) },
                  { key: 'email', icon: Mail, label: t('clinic.doctorsPage.profile.email'), value: doctor.email },
                ].map(c => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0"><Icon size={14} className="text-slate-500" aria-hidden="true" /></div>
                      <span className="sr-only">{c.label}: </span>
                      <span className="text-sm text-slate-700 truncate" dir="ltr">{c.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Upcoming Blocked Slots */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('clinic.doctorsPage.profile.blockedTitle')}</div>
                {doctor.upcomingBlockedSlots.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('clinic.doctorsPage.profile.noBlocked')}</p>
                ) : (
                  <div className="space-y-2">
                    {doctor.upcomingBlockedSlots.map((b, idx) => (
                      <div key={idx} className="px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{formatClinicDate(b.date, lang)}</span>
                          <span className="text-xs text-slate-500" style={{ fontFamily: 'DM Mono, monospace' }}>{timeLabel(b.start, lang)} – {timeLabel(b.end, lang)}</span>
                        </div>
                        {b.reason && <p className="text-xs text-slate-400 mt-1">{b.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('clinic.doctorsPage.profile.availabilityTitle')}</div>
              {doctor.weeklyAvailability.length === 0 ? (
                <p className="text-sm text-slate-400">{t('clinic.doctorsPage.profile.noAvailability')}</p>
              ) : (
                <div className="space-y-2">
                  {doctor.weeklyAvailability.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{t(`shared.weekdays.${WEEKDAY_KEYS[a.day] ?? 'sun'}`)}</span>
                      <span className="text-xs text-slate-500" style={{ fontFamily: 'DM Mono, monospace' }}>{timeLabel(a.start, lang)} – {timeLabel(a.end, lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {doctor.status === 'pending' && onApprove && (
            <div className="space-y-2 mt-6">
              <button type="button" onClick={() => { onApprove(); onClose(); }} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <CheckCircle size={16} aria-hidden="true" /> {t('clinic.doctorsPage.profile.approveDoctor')}
              </button>
              {onReject && (
                <button type="button" onClick={() => { onReject(); onClose(); }} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <XCircle size={16} aria-hidden="true" /> {t('clinic.doctorsPage.profile.rejectRequest')}
                </button>
              )}
            </div>
          )}
          {doctor.status === 'suspended' && onReactivate && (
            <button type="button" onClick={() => { onReactivate(); onClose(); }} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-6">
              <CheckCircle size={16} aria-hidden="true" /> {t('clinic.doctorsPage.profile.reactivateDoctor')}
            </button>
          )}
          {doctor.status === 'active' && onSuspend && (
            <button type="button" onClick={() => { onSuspend(); onClose(); }} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 mt-6">
              {t('clinic.doctorsPage.profile.suspendDoctor')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface UpcomingVisit {
  id: string;
  scheduledAt: string;
  patientName: string;
}

/**
 * QA-203: before a doctor is suspended or removed, show their upcoming visits at this clinic and
 * let the clinic cancel them (patients are notified) or keep them.
 */
function EndDoctorLinkDialog({
  doctor,
  action,
  facilityId,
  busy,
  onConfirm,
  onCancel,
}: {
  doctor: Doctor;
  action: 'suspend' | 'remove';
  facilityId: string;
  busy: boolean;
  onConfirm: (cancelFutureVisits: boolean) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [visits, setVisits] = useState<UpcomingVisit[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nowIso = new Date().toISOString();
        const { rows } = await fetchAllPages((from, to) =>
          supabase
            .from('appointments')
            .select('id, patient_id, scheduled_at')
            .eq('facility_id', facilityId)
            .eq('doctor_id', doctor.doctorUserId)
            .eq('is_deleted', false)
            .in('status', ['scheduled', 'confirmed'])
            .gte('scheduled_at', nowIso)
            .order('scheduled_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)
        );
        const people = await fetchClinicPatientProfiles(supabase, rows.map(r => r.patient_id));
        const names = new Map(people.map(p => [p.user_id, p.full_name]));
        if (!cancelled) {
          setVisits(rows.map(r => ({ id: r.id, scheduledAt: r.scheduled_at, patientName: names.get(r.patient_id) ?? t('clinic.appointments.unknownPatient') })));
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.doctorUserId, facilityId]);

  const count = visits?.length ?? 0;
  const E = 'clinic.doctorsPage.end';

  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="end-doctor-link-title" dir={i18n.dir()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Trash2 size={22} className="text-red-500" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h3 id="end-doctor-link-title" className="font-bold text-slate-900 text-lg">
              {t(action === 'remove' ? `${E}.removeTitle` : `${E}.suspendTitle`)}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t(action === 'remove' ? `${E}.removeText` : `${E}.suspendText`, { name: doctor.name })}
            </p>
          </div>
          {loadFailed ? (
            <p role="alert" className="text-sm text-red-600 text-center">{t(`${E}.visitsLoadFailed`)}</p>
          ) : visits === null ? (
            <p className="text-sm text-slate-400 text-center">{t(`${E}.checkingVisits`)}</p>
          ) : count === 0 ? (
            <p className="text-sm text-slate-500 text-center">{t(`${E}.noUpcomingVisits`)}</p>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                {t(`${E}.visitsStillBooked`, { count })}
              </p>
              <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-xs text-amber-900">
                {visits!.slice(0, 20).map(v => (
                  <li key={v.id}>
                    {formatClinicDate(v.scheduledAt, lang)} {formatClinicTime(v.scheduledAt, lang)} — {v.patientName}
                  </li>
                ))}
                {count > 20 && <li>{t(`${E}.andMore`, { value: formatLocaleDigits(count - 20, lang) })}</li>}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 px-6 pb-6">
          {count > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(true)}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {t(action === 'remove' ? `${E}.removeAndCancel` : `${E}.suspendAndCancel`)}
            </button>
          )}
          <button
            type="button"
            disabled={busy || visits === null || loadFailed}
            onClick={() => onConfirm(false)}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${count > 0 ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {count > 0
              ? t(action === 'remove' ? `${E}.removeAndKeep` : `${E}.suspendAndKeep`)
              : t(action === 'remove' ? `${E}.yesRemove` : `${E}.yesSuspend`)}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            {t(`${E}.back`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ClinicDoctors() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSpec, setFilterSpec] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editForm, setEditForm] = useState({ consultation: '', telemedicine: '', followUp: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<{ id: string; action: 'suspend' | 'remove' } | null>(null);
  const [endingLink, setEndingLink] = useState(false);
  const [inviteBanner, setInviteBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get facility ID
      const { data: memberData, error: memberError } = await supabase
        .from('clinic_portal_members')
        .select('facility_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.facility_id) throw new Error('No clinic facility found.');

      const fId = memberData.facility_id;
      setFacilityId(fId);

      // QA-206: today is the clinic (Dubai) day, not the browser's
      const todayKey = clinicTodayKey();
      const { startIso: todayStart, endIso: todayEnd } = clinicDayRangeUtc(todayKey);

      // Fetch facility staff (exclude terminal statuses)
      const { data: staffData, error: staffError } = await supabase
        .from('facility_staff')
        .select('id, doctor_user_id, is_available, is_active, invitation_status, consultation_fee, telemedicine_fee, follow_up_fee, created_at')
        .eq('facility_id', fId)
        .not('invitation_status', 'in', '("removed","rejected","cancelled")');

      if (staffError) throw staffError;

      const doctorUserIds = (staffData ?? []).map(s => s.doctor_user_id).filter(Boolean);

      if (doctorUserIds.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      // QA-206: lookups in small batches (QA-197)
      const profileData = await fetchByIdChunks(doctorUserIds, ids =>
        supabase.from('user_profiles').select('user_id, full_name, phone, email').in('user_id', ids)
      );
      const doctorProfileData = await fetchByIdChunks(doctorUserIds, ids =>
        supabase.from('doctor_profiles').select('user_id, specialization, license_number, dha_license_verified, consultation_fee').in('user_id', ids)
      );
      const ratingsData = await fetchByIdChunks(doctorUserIds, ids =>
        supabase.from('doctor_ratings_summary').select('doctor_id, average_rating, total_reviews').in('doctor_id', ids)
      );

      // QA-206: today's visits in clinic time; cancelled visits are not counted
      const { data: todayApptData } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('facility_id', fId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .eq('is_deleted', false)
        .neq('status', 'cancelled');

      // QA-206: exact total per doctor (reading every row stopped at 1,000)
      const totalCounts = await Promise.all(
        doctorUserIds.map(async doctorId => {
          const { count, error: countError } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('facility_id', fId)
            .eq('doctor_id', doctorId)
            .eq('is_deleted', false)
            .neq('status', 'cancelled');
          if (countError) throw countError;
          return [doctorId, count ?? 0] as const;
        })
      );

      const availabilityData = await fetchByIdChunks(doctorUserIds, ids =>
        supabase.from('doctor_availability').select('doctor_id, day_of_week, start_time, end_time').in('doctor_id', ids).eq('is_active', true)
      );

      // Upcoming blocked time, from today (clinic day)
      const blockedData = (await fetchByIdChunks(doctorUserIds, ids =>
        supabase
          .from('blocked_slots')
          .select('doctor_id, blocked_date, start_time, end_time, reason')
          .in('doctor_id', ids)
          .gte('blocked_date', todayKey)
          .order('blocked_date', { ascending: true })
      )).sort((a, b) => a.blocked_date.localeCompare(b.blocked_date));


      const availabilityMap = new Map<string, { day: number; start: string; end: string }[]>();
      availabilityData.forEach(a => {
        const list = availabilityMap.get(a.doctor_id) ?? [];
        list.push({ day: a.day_of_week, start: a.start_time, end: a.end_time });
        availabilityMap.set(a.doctor_id, list);
      });

      const blockedMap = new Map<string, { date: string; start: string; end: string; reason: string | null }[]>();
      blockedData.forEach(b => {
        const list = blockedMap.get(b.doctor_id) ?? [];
        list.push({ date: b.blocked_date, start: b.start_time, end: b.end_time, reason: b.reason });
        blockedMap.set(b.doctor_id, list);
      });

      // Build maps
      const profileMap = new Map(profileData.map(p => [p.user_id, p]));
      const doctorProfileMap = new Map(doctorProfileData.map(d => [d.user_id, d]));
      const ratingsMap = new Map(ratingsData.map(r => [r.doctor_id, r]));

      const todayApptCount = new Map<string, number>();
      (todayApptData ?? []).forEach(a => {
        todayApptCount.set(a.doctor_id, (todayApptCount.get(a.doctor_id) ?? 0) + 1);
      });

      const totalApptCount = new Map<string, number>(totalCounts);

      // Build doctor rows
      const doctorRows: Doctor[] = (staffData ?? []).map((staff, idx) => {
        const profile = profileMap.get(staff.doctor_user_id);
        const doctorProfile = doctorProfileMap.get(staff.doctor_user_id);
        const ratings = ratingsMap.get(staff.doctor_user_id);
        const fullName = doctorName(t, profile?.full_name);
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : (nameParts[0]?.[0] ?? 'D').toUpperCase();

        // QA-204: 'active' (admin-linked) counts as active; suspended stays suspended
        const status: Doctor['status'] = clinicDoctorStatus(staff.invitation_status, staff.is_active);

        return {
          id: staff.id,
          doctorUserId: staff.doctor_user_id,
          name: fullName,
          specialty: specialtyLabel(t, doctorProfile?.specialization),
          dhaLicense: doctorProfile?.license_number ?? '—',
          phone: profile?.phone ?? '—',
          email: profile?.email ?? '—',
          status,
          initials,
          gradient: gradients[idx % gradients.length],
          joinedAt: staff.created_at ?? null,
          todayAppts: todayApptCount.get(staff.doctor_user_id) ?? 0,
          totalAppts: totalApptCount.get(staff.doctor_user_id) ?? 0,
          rating: ratings?.average_rating ? Number(Number(ratings.average_rating).toFixed(1)) : 0,
          consultationFee: staff.consultation_fee ?? doctorProfile?.consultation_fee ?? null,
          clinicFees: {
            consultation: staff.consultation_fee == null ? null : Number(staff.consultation_fee),
            telemedicine: staff.telemedicine_fee == null ? null : Number(staff.telemedicine_fee),
            followUp: staff.follow_up_fee == null ? null : Number(staff.follow_up_fee),
          },
          weeklyAvailability: availabilityMap.get(staff.doctor_user_id) ?? [],
          upcomingBlockedSlots: blockedMap.get(staff.doctor_user_id) ?? [],
          dhaVerified: doctorProfile?.dha_license_verified ?? false,
        };
      });

      setDoctors(doctorRows);
      const uniqueSpecialties = [...new Set(doctorRows.map(d => d.specialty).filter(Boolean))];
      setSpecialties(uniqueSpecialties);
    } catch (err) {
      // QA-207: plain message in the UI language, not the raw database text
      console.warn('[ClinicDoctors] load failed', err);
      setError(t('clinic.doctorsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void fetchDoctors()} className="ms-2 font-semibold underline">{t('clinic.actions.retry')}</button>
        </div>
      </div>
    );
  }

  const filtered = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSpec = filterSpec === 'all' || d.specialty === filterSpec;
    return matchSearch && matchStatus && matchSpec;
  });

  const counts = {
    all: doctors.length,
    active: doctors.filter(d => d.status === 'active').length,
    pending: doctors.filter(d => d.status === 'pending').length,
  };

  const handleApprove = async (id: string) => {
    try {
      const doctor = doctors.find(d => d.id === id);
      if (!doctor?.doctorUserId || !facilityId) throw new Error('Missing doctor or facility info.');

      const { error } = await supabase.rpc('approve_doctor_and_link_appointments', {
        p_staff_id: id,
        p_facility_id: facilityId,
        p_doctor_user_id: doctor.doctorUserId,
      });

      if (error) throw error;

      setDoctors(prev => prev.map(d => d.id === id ? { ...d, status: 'active' } : d));
    } catch (err) {
      // QA-200: only a pending join request can be approved; refresh if it changed meanwhile
      if ((err as { code?: string } | null)?.code === '22023') await fetchDoctors();
      setError(t(doctorLinkErrorKey(err)));
    }
  };

  /** QA-199: reject / cancel invite / suspend / remove through clinic_doctor_link_action. */
  const runAction = async (id: string, action: ClinicDoctorLinkAction) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) return;
    try {
      await runDoctorLinkAction(doctor.doctorUserId, action);
      if (action === 'cancel_invite' || action === 'remove' || action === 'reject') {
        // these links are no longer listed (same as after a reload)
        setDoctors(prev => prev.filter(d => d.id !== id));
      } else {
        setDoctors(prev => prev.map(d => d.id === id ? { ...d, status: action === 'reactivate' ? 'active' : 'suspended' } : d));
      }
      setMenuOpen(null);
    } catch (err) {
      setMenuOpen(null);
      if ((err as { code?: string } | null)?.code === '22023') await fetchDoctors();
      setError(t(doctorLinkErrorKey(err)));
    }
  };

  const handleReject = (id: string) => runAction(id, 'reject');
  const handleCancelInvite = (id: string) => runAction(id, 'cancel_invite');
  const handleReactivate = (id: string) => runAction(id, 'reactivate');

  /** QA-203: suspend / remove, optionally cancelling the doctor's upcoming visits, in one call. */
  const endDoctorLink = async (cancelFutureVisits: boolean) => {
    if (!endTarget) return;
    const doctor = doctors.find(d => d.id === endTarget.id);
    if (!doctor) return;
    setEndingLink(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('clinic_end_doctor_link', {
        p_doctor_user_id: doctor.doctorUserId,
        p_action: endTarget.action,
        p_cancel_future_visits: cancelFutureVisits,
      });
      if (rpcError) throw rpcError;
      const cancelled = Number((data as { cancelled_visits?: number } | null)?.cancelled_visits ?? 0);
      if (endTarget.action === 'remove') {
        setDoctors(prev => prev.filter(d => d.id !== doctor.id));
      } else {
        setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, status: 'suspended' } : d));
      }
      const done = t(endTarget.action === 'remove' ? 'clinic.doctorsPage.banners.removed' : 'clinic.doctorsPage.banners.suspended', { name: doctor.name });
      setInviteBanner(cancelled > 0
        ? `${done} ${t('clinic.doctorsPage.banners.visitsCancelled', { count: cancelled })}`
        : done);
      setTimeout(() => setInviteBanner(null), 6000);
    } catch (err) {
      if ((err as { code?: string } | null)?.code === '22023') await fetchDoctors();
      setError(t(doctorLinkErrorKey(err)));
    } finally {
      setEndingLink(false);
      setEndTarget(null);
    }
  };

  const handleStartEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    const asText = (value: number | null) => (value == null ? '' : String(value));
    setEditForm({
      consultation: asText(doctor.clinicFees.consultation),
      telemedicine: asText(doctor.clinicFees.telemedicine),
      followUp: asText(doctor.clinicFees.followUp),
    });
    setEditError(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editingDoctor) return;
    // QA-205: empty = not set; otherwise 0 to 100,000 with at most 2 decimals
    const consultation = parseFeeInput(editForm.consultation);
    const telemedicine = parseFeeInput(editForm.telemedicine);
    const followUp = parseFeeInput(editForm.followUp);
    if (!consultation.ok || !telemedicine.ok || !followUp.ok) {
      setEditError(t('clinic.doctorsPage.edit.feeError'));
      return;
    }
    setEditError(null);
    setSavingEdit(true);
    try {
      const { error: updateError } = await supabase
        .from('facility_staff')
        // QA-199: the edit popup only changes fees; status changes use the doctor actions.
        // QA-205: the database records every fee change in the pricing history.
        .update({
          consultation_fee: consultation.value,
          telemedicine_fee: telemedicine.value,
          follow_up_fee: followUp.value,
        })
        .eq('id', editingDoctor.id);
      if (updateError) throw updateError;
      setDoctors(prev => prev.map(d => d.id === editingDoctor.id ? {
        ...d,
        consultationFee: consultation.value,
        clinicFees: { consultation: consultation.value, telemedicine: telemedicine.value, followUp: followUp.value },
      } : d));
      setEditingDoctor(null);
    } catch (err) {
      setError(t((err as { code?: string } | null)?.code === '42501'
        ? 'clinic.doctorsPage.errors.notAllowed'
        : 'clinic.doctorsPage.errors.saveFailed'));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t('clinic.doctorsPage.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('clinic.doctorsPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} aria-hidden="true" /> {t('clinic.doctorsPage.add')}
        </button>
      </div>

      {inviteBanner && (
        <div role="status" className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCircle size={15} aria-hidden="true" /> {inviteBanner}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('clinic.doctorsPage.kpiTotal'), value: doctors.length, icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: t('clinic.doctorsPage.kpiActive'), value: counts.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('clinic.doctorsPage.kpiPending'), value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('clinic.doctorsPage.kpiWithVisitsToday'), value: doctors.filter(d => d.todayAppts > 0).length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 shrink-0 rounded-xl ${k.bg} flex items-center justify-center`}><Icon size={18} className={k.color} aria-hidden="true" /></div>
              <div>
                <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(k.value, lang)}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} aria-hidden="true" className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('clinic.doctorsPage.searchPlaceholder')}
            aria-label={t('clinic.doctorsPage.searchLabel')}
            className="w-full ps-9 pe-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div role="group" aria-label={t('clinic.doctorsPage.statusFilterLabel')} className="flex items-center gap-2">
          {[
            ['all', t('clinic.doctorsPage.filterAll', { count: counts.all })],
            ['active', t('clinic.doctorsPage.filterActive', { count: counts.active })],
            ['pending', t('clinic.doctorsPage.filterPending', { count: counts.pending })],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filterStatus === v}
              onClick={() => setFilterStatus(v)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterStatus === v ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >{label}</button>
          ))}
        </div>
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value)}
          aria-label={t('clinic.doctorsPage.specialtyFilterLabel')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="all">{t('clinic.doctorsPage.allSpecialties')}</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Pending banner */}
      {counts.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold text-amber-800 text-sm">{t('clinic.doctorsPage.pendingBanner', { count: counts.pending })}</span>
            <span className="text-amber-700 text-sm">{t('clinic.doctorsPage.pendingHint')}</span>
          </div>
        </div>
      )}

      {/* Doctor table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {[
                t('clinic.doctorsPage.colDoctor'), t('clinic.doctorsPage.colSpecialty'), t('clinic.doctorsPage.colLicence'),
                t('clinic.doctorsPage.colToday'), t('clinic.doctorsPage.colTotal'), t('clinic.doctorsPage.colFee'),
                t('clinic.doctorsPage.colRating'), t('clinic.doctorsPage.colStatus'),
              ].map(h => (
                <th key={h} scope="col" className="text-start text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
              ))}
              <th scope="col" className="px-5 py-3"><span className="sr-only">{t('clinic.doctorsPage.colActions')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {d.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{d.name}</div>
                      <div className="text-xs text-slate-400">
                        {d.status === 'pending' || d.status === 'invited' || d.status === 'declined'
                          ? t(`clinic.doctorsPage.status.${d.status}`)
                          : t('clinic.doctorsPage.joined', { date: d.joinedAt ? monthYear(d.joinedAt, lang) : t('clinic.doctorsPage.joinedUnknown') })}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{d.specialty}</td>
                <td className="px-5 py-4">
                  <div className="font-mono text-xs text-slate-600" dir="ltr">{d.dhaLicense}</div>
                  <div className={`text-[11px] font-medium ${d.dhaVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {d.dhaVerified ? t('clinic.doctorsPage.verified') : t('clinic.doctorsPage.notVerified')}
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(d.todayAppts, lang)}</td>
                <td className="px-5 py-4 font-bold text-sm text-slate-800" style={{ fontFamily: 'DM Mono, monospace' }}>{formatLocaleDigits(d.totalAppts, lang)}</td>
                <td className="px-5 py-4 font-bold text-sm text-teal-700" style={{ fontFamily: 'DM Mono, monospace' }}>{d.consultationFee == null ? '—' : formatLocaleCurrency(d.consultationFee, lang)}</td>
                <td className="px-5 py-4">
                  {d.rating > 0 ? (
                    <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Star size={12} fill="currentColor" aria-hidden="true" />{formatLocaleDecimal(d.rating, lang, 1)}</span>
                  ) : <span className="text-slate-300 text-sm">—</span>}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[d.status].color}`}>{t(`clinic.doctorsPage.status.${d.status}`)}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDoctor(d)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      title={t('clinic.doctorsPage.viewProfile')}
                      aria-label={`${t('clinic.doctorsPage.viewProfile')}: ${d.name}`}
                    >
                      <Eye size={15} className="text-slate-400 hover:text-teal-600" aria-hidden="true" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === d.id ? null : d.id); }}
                        onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(null); }}
                        aria-label={t('clinic.doctorsPage.moreActions', { name: d.name })}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen === d.id}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={15} className="text-slate-400" aria-hidden="true" />
                      </button>
                      {menuOpen === d.id && (
                        <div role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(null); }} className="absolute end-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 w-44 py-1">
                          {clinicDoctorActions(d.status).canApprove && (
                            <button onClick={() => { handleApprove(d.id); setMenuOpen(null); }} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"><CheckCircle size={14} aria-hidden="true" /> {t('clinic.doctorsPage.approve')}</button>
                          )}
                          {clinicDoctorActions(d.status).canReject && (
                            <button onClick={() => { void handleReject(d.id); setMenuOpen(null); }} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><XCircle size={14} aria-hidden="true" /> {t('clinic.doctorsPage.reject')}</button>
                          )}
                          {clinicDoctorActions(d.status).canCancelInvite && (
                            <button onClick={() => { void handleCancelInvite(d.id); setMenuOpen(null); }} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><XCircle size={14} aria-hidden="true" /> {t('clinic.doctorsPage.cancelInvite')}</button>
                          )}
                          {clinicDoctorActions(d.status).canReactivate && (
                            <button onClick={() => { void handleReactivate(d.id); setMenuOpen(null); }} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"><CheckCircle size={14} aria-hidden="true" /> {t('clinic.doctorsPage.reactivate')}</button>
                          )}
                          {clinicDoctorActions(d.status).canEditFee && (
                            <button onClick={() => handleStartEdit(d)} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} aria-hidden="true" /> {t('clinic.doctorsPage.editFee')}</button>
                          )}
                          {clinicDoctorActions(d.status).canRemove && (
                            <button onClick={() => { setEndTarget({ id: d.id, action: 'remove' }); setMenuOpen(null); }} role="menuitem" type="button" className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} aria-hidden="true" /> {t('clinic.doctorsPage.remove')}</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Stethoscope size={32} aria-hidden="true" className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('clinic.doctorsPage.empty')}</p>
          </div>
        )}
      </div>

      {showAdd && facilityId && (
        <AddDoctorModal
          onClose={() => setShowAdd(false)}
          existingDoctorIds={doctors.filter(d => !clinicDoctorActions(d.status).canInviteAgain).map(d => d.doctorUserId)}
          onInvited={(doctorName) => {
            setShowAdd(false);
            setInviteBanner(t('clinic.doctorsPage.banners.invited', { name: doctorName }));
            void fetchDoctors();
            setTimeout(() => setInviteBanner(null), 4000);
          }}
        />
      )}

      {editingDoctor ? createPortal(
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-doctor-title" dir={i18n.dir()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${editingDoctor.gradient} flex items-center justify-center text-white font-bold text-sm`}>
                  {editingDoctor.initials}
                </div>
                <div>
                  <h3 id="edit-doctor-title" className="font-bold text-slate-900">{t('clinic.doctorsPage.edit.title')}</h3>
                  <p className="text-xs text-slate-500">{editingDoctor.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingDoctor(null)} aria-label={t('clinic.doctorsPage.edit.close')} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-400" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Fees (QA-205) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  ['consultation', t('clinic.doctorsPage.edit.feeConsultation')],
                  ['telemedicine', t('clinic.doctorsPage.edit.feeTelemedicine')],
                  ['followUp', t('clinic.doctorsPage.edit.feeFollowUp')],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`edit-fee-${key}`} className="block text-xs font-semibold text-slate-600 mb-2">{label}</label>
                    <input
                      id={`edit-fee-${key}`}
                      type="text"
                      inputMode="decimal"
                      value={editForm[key]}
                      onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={t('clinic.doctorsPage.edit.feeNotSet')}
                      aria-invalid={editError ? !parseFeeInput(editForm[key]).ok : undefined}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">{t('clinic.doctorsPage.edit.feeHint')}</p>
              {editError && <p role="alert" className="text-xs text-red-600">{editError}</p>}

              {/* Availability */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('clinic.doctorsPage.edit.readOnly')}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">{t('clinic.doctorsPage.edit.specialty')}</div>
                    <div className="font-medium text-slate-800">{editingDoctor.specialty}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t('clinic.doctorsPage.edit.licence')}</div>
                    <div className="font-mono text-xs text-slate-800" dir="ltr">{editingDoctor.dhaLicense}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t('clinic.doctorsPage.edit.phone')}</div>
                    <div className="font-medium text-slate-800" dir="ltr">{formatLocalePhoneDisplay(editingDoctor.phone, lang)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t('clinic.doctorsPage.edit.email')}</div>
                    <div className="font-medium text-slate-800 truncate" dir="ltr">{editingDoctor.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setEditingDoctor(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                {t('clinic.doctorsPage.edit.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save size={15} aria-hidden="true" />
                {savingEdit ? t('clinic.doctorsPage.edit.saving') : t('clinic.doctorsPage.edit.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      {selectedDoctor && (
        <DoctorDetailDrawer
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onApprove={selectedDoctor.status === 'pending' ? () => void handleApprove(selectedDoctor.id) : undefined}
          onReject={selectedDoctor.status === 'pending' ? () => void handleReject(selectedDoctor.id) : undefined}
          onSuspend={selectedDoctor.status === 'active' ? () => setEndTarget({ id: selectedDoctor.id, action: 'suspend' }) : undefined}
          onReactivate={selectedDoctor.status === 'suspended' ? () => void handleReactivate(selectedDoctor.id) : undefined}
        />
      )}
      {endTarget && facilityId && doctors.some(d => d.id === endTarget.id) && (
        <EndDoctorLinkDialog
          doctor={doctors.find(d => d.id === endTarget.id)!}
          action={endTarget.action}
          facilityId={facilityId}
          busy={endingLink}
          onConfirm={(cancelFutureVisits) => void endDoctorLink(cancelFutureVisits)}
          onCancel={() => setEndTarget(null)}
        />
      )}
    </div>
  );
}
