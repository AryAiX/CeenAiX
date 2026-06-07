import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, ErrorState, Screen, Skeleton } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import { usePatientDashboard } from '../../hooks/use-patient-dashboard';
import { colors } from '../../lib/theme';

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function StatCard({ label, value, badge }: { label: string; value: string; badge?: string }): React.ReactElement {
  return (
    <View className="mb-3 w-[48%] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-xs font-medium text-slate-400">{label}</Text>
      {badge ? <Text className="mt-2 text-xs font-semibold text-brand-600">{badge}</Text> : null}
    </View>
  );
}

export function DashboardScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { data, loading, error, refetch } = usePatientDashboard(user?.id);

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const displayName = profile?.first_name?.trim() || profile?.full_name?.trim()?.split(/\s+/)[0] || 'there';
  const next = data?.nextAppointment ?? null;
  const meds = data?.medications ?? [];
  const insurance = data?.insurance ?? null;
  const vitals = data?.vitals;

  const nextCountdown = next
    ? Math.max(0, Math.ceil((new Date(next.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.brand[600]} />}>
      <View className="pt-2">
        <Text className="text-sm font-medium text-slate-500">{greeting()},</Text>
        <Text className="mt-0.5 text-2xl font-bold text-slate-900">{displayName}</Text>
      </View>

      {error ? (
        <View className="mt-4">
          <ErrorState message={error} onRetry={refetch} />
        </View>
      ) : null}

      <View className="mt-5 flex-row flex-wrap justify-between">
        {loading && !data ? (
          <>
            <Skeleton className="mb-3 h-24 w-[48%]" />
            <Skeleton className="mb-3 h-24 w-[48%]" />
            <Skeleton className="mb-3 h-24 w-[48%]" />
            <Skeleton className="mb-3 h-24 w-[48%]" />
          </>
        ) : (
          <>
            <StatCard
              label={t('patient.dashboard.upcomingAppointments', { defaultValue: 'Upcoming' })}
              value={String(data?.upcomingAppointmentsCount ?? 0)}
              badge={t('mobile.tabs.appointments')}
            />
            <StatCard
              label="HbA1c"
              value={vitals?.latestHba1c != null ? `${vitals.latestHba1c}%` : 'N/A'}
            />
            <StatCard
              label="Blood Pressure"
              value={
                vitals?.latestSystolic != null && vitals?.latestDiastolic != null
                  ? `${vitals.latestSystolic}/${vitals.latestDiastolic}`
                  : 'N/A'
              }
            />
            <StatCard
              label="Medications"
              value={String(meds.length)}
              badge={data?.adherencePercentage != null ? `${data.adherencePercentage}% taken` : undefined}
            />
          </>
        )}
      </View>

      <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
        {t('patient.dashboard.nextAppointment', { defaultValue: 'Next appointment' })}
      </Text>
      {loading && !data ? (
        <Skeleton className="h-28 w-full" />
      ) : next ? (
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">
              {new Date(next.scheduledAt).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <View className="rounded-lg bg-brand-50 px-2.5 py-1">
              <Text className="text-xs font-semibold text-brand-700">{`${nextCountdown} days`}</Text>
            </View>
          </View>
          <Text className="mt-2 text-sm font-semibold text-slate-900">{next.doctorName}</Text>
          {next.specialty ? <Text className="text-xs font-medium text-brand-600">{next.specialty}</Text> : null}
          <Text className="mt-1 text-xs text-slate-400">
            {new Date(next.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            {next.doctorCity ? ` · ${next.doctorCity}` : ''}
          </Text>
        </Card>
      ) : (
        <Card>
          <Text className="text-sm text-slate-500">
            {t('patient.dashboard.noUpcomingBody', { defaultValue: 'No upcoming appointments.' })}
          </Text>
        </Card>
      )}

      <Text className="mb-2 mt-5 text-sm font-semibold text-slate-900">
        {t('patient.dashboard.medicationsTitle', { defaultValue: "Today's medications" })}
      </Text>
      {loading && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : meds.length > 0 ? (
        <Card>
          {meds.map((med, index) => (
            <View
              key={med.id}
              className={`flex-row items-center py-2.5 ${index > 0 ? 'border-t border-slate-50' : ''}`}
            >
              <View className={`mr-3 h-2.5 w-2.5 rounded-full ${med.isDispensed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">{med.medicationName}</Text>
                <Text className="text-xs text-slate-400">{med.detail}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <Text className="text-sm text-slate-500">
            {t('patient.dashboard.noMedBody', { defaultValue: 'No active medications.' })}
          </Text>
        </Card>
      )}

      <Text className="mb-2 mt-5 text-sm font-semibold text-slate-900">
        {t('patient.dashboard.insuranceTitle', { defaultValue: 'Insurance' })}
      </Text>
      {loading && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : insurance ? (
        <View className="rounded-2xl bg-slate-800 p-4">
          <Text className="text-sm font-bold text-white">{insurance.providerCompany.toUpperCase()}</Text>
          <Text className="mt-0.5 text-xs text-brand-100">{insurance.planName}</Text>
          {insurance.annualLimit != null ? (
            <Text className="mt-3 text-xs text-white/70">
              {`AED ${Math.round(insurance.annualLimitUsed).toLocaleString()} / ${Math.round(
                insurance.annualLimit
              ).toLocaleString()}`}
            </Text>
          ) : null}
        </View>
      ) : (
        <Card>
          <Text className="text-sm text-slate-500">No insurer on file.</Text>
        </Card>
      )}

      <View className="mt-5 rounded-2xl border border-brand-100 bg-white p-4">
        <Text className="text-xs font-bold uppercase tracking-wide text-brand-600">AI Health Tip</Text>
        <Text className="mt-1.5 text-xs leading-relaxed text-slate-600">
          Staying hydrated helps regulate blood pressure. Aim for at least 8 glasses of water throughout the day.
        </Text>
      </View>
    </Screen>
  );
}
