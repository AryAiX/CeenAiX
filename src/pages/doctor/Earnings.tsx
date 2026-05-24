import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Banknote, Calendar, FileSpreadsheet, Receipt, Wallet } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import { useDoctorDashboard } from '../../hooks';
import { useAuth } from '../../lib/auth-context';
import { formatLocaleDigits } from '../../lib/i18n-ui';

export const DoctorEarnings = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { user, doctorProfile } = useAuth();
  const { data, loading, error, refetch } = useDoctorDashboard(user?.id);
  const uiLang = i18n.language ?? 'en';
  const fee = doctorProfile?.consultation_fee ?? 0;
  const completedToday = data?.completedTodayAppointments ?? 0;
  const scheduledToday = data?.todayAppointments ?? 0;
  const estimatedToday = completedToday * fee;
  const projectedToday = scheduledToday * fee;
  const pendingClinicalReviews = data?.pendingReviews ?? 0;
  const currency = 'AED';
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'claims' | 'payouts' | 'analytics'>('overview');
  const tabs = ['overview', 'transactions', 'claims', 'payouts', 'analytics'] as const;

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
              <Banknote className="h-4 w-4" />
              {t('doctor.earnings.title')}
            </div>
            <h1 className="text-3xl font-bold">{currency} {formatLocaleDigits(estimatedToday, uiLang)}</h1>
            <p className="mt-2 text-emerald-100">{t('doctor.earnings.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/doctor/appointments')}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {t('doctor.earnings.actionOpenDashboard')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: t('doctor.earnings.completedToday', { defaultValue: 'Completed today' }),
            value: `${currency} ${formatLocaleDigits(estimatedToday, uiLang)}`,
            icon: Wallet,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
          },
          {
            label: t('doctor.earnings.todayProjection', { defaultValue: "Today's projection" }),
            value: `${currency} ${formatLocaleDigits(projectedToday, uiLang)}`,
            icon: Calendar,
            color: 'text-teal-600',
            bg: 'bg-teal-100',
          },
          {
            label: t('doctor.earnings.consultationFee', { defaultValue: 'Consultation fee' }),
            value: fee > 0 ? `${currency} ${formatLocaleDigits(fee, uiLang)}` : '—',
            icon: Receipt,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
          },
          {
            label: t('doctor.earnings.pendingReviews', { defaultValue: 'Pending reviews' }),
            value: formatLocaleDigits(pendingClinicalReviews, uiLang),
            icon: FileSpreadsheet,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="mt-1 text-xs text-slate-400">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
                activeTab === tab ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t(`doctor.earnings.tab.${tab}`, { defaultValue: tab[0].toUpperCase() + tab.slice(1) })}
            </button>
          ))}
        </div>
        {activeTab !== 'overview' ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {t(`doctor.earnings.placeholder.${activeTab}`, {
                defaultValue: `${activeTab[0].toUpperCase() + activeTab.slice(1)} will use the billing, claims, and payout tables once that data model is available. Current revenue values stay bound to live appointments and doctor profile fees.`,
              })}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled
                title={t('doctor.earnings.exportComingSoon', {
                  defaultValue: 'Billing exports arrive with the dedicated revenue model.',
                })}
                className="cursor-not-allowed rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400 opacity-80"
              >
                {t('doctor.earnings.exportTab', { defaultValue: 'Export tab data' })}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {t('doctor.earnings.todayEventsHeading', { defaultValue: "Today's revenue events" })}
        </h2>
        {(data?.todaySchedule ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            {t('doctor.earnings.noAppointmentsToday', { defaultValue: "No appointments on today's schedule." })}
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.todaySchedule ?? []).map((appointment) => (
              <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <div className="font-bold text-slate-900">{appointment.patientName}</div>
                  <div className="text-sm text-slate-500">{appointment.chiefComplaint ?? appointment.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {appointment.status === 'completed' && fee > 0 ? `${currency} ${formatLocaleDigits(fee, uiLang)}` : '—'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t(`shared.appointmentStatus.${appointment.status}`, { defaultValue: appointment.status })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {t('doctor.earnings.estimateNote', {
          defaultValue:
            'Earnings are estimated from completed appointments and the doctor profile consultation fee. Claims, payouts, VAT, and remittance reports need a dedicated billing model.',
        })}
      </div>
    </div>
  );
};
