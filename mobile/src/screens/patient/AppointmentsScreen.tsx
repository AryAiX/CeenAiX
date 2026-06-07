import { useCallback } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppointmentStatus } from '@ceenaix/types';
import { Card, EmptyState, ErrorState, Screen, Skeleton } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import { usePatientAppointments } from '../../hooks/use-patient-appointments';
import { colors } from '../../lib/theme';
import type { AppointmentsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppointmentsStackParamList, 'AppointmentsList'>;

const statusStyle: Record<AppointmentStatus, string> = {
  scheduled: 'bg-brand-50 text-brand-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-700',
  no_show: 'bg-amber-50 text-amber-700',
};

export function AppointmentsScreen({ navigation }: Props): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientAppointments(user?.id);
  const onRefresh = useCallback(() => refetch(), [refetch]);

  const appointments = data ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.brand[600]} />}>
      <Text className="pb-3 pt-2 text-2xl font-bold text-slate-900">{t('mobile.tabs.appointments')}</Text>

      {error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {loading && !data ? (
        <View>
          <Skeleton className="mb-3 h-24 w-full" />
          <Skeleton className="mb-3 h-24 w-full" />
          <Skeleton className="mb-3 h-24 w-full" />
        </View>
      ) : appointments.length === 0 && !error ? (
        <EmptyState title="No appointments yet" body="Your upcoming and past visits will appear here." />
      ) : (
        appointments.map((appt) => {
          const date = new Date(appt.scheduled_at);
          return (
            <Pressable
              key={appt.id}
              className="mb-3"
              accessibilityRole="button"
              onPress={() => navigation.navigate('AppointmentDetail', { id: appt.id })}
            >
              <Card>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-slate-900">{appt.doctorName}</Text>
                    {appt.doctorSpecialty ? (
                      <Text className="text-xs font-medium text-brand-600">{appt.doctorSpecialty}</Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-slate-400">
                      {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View className={`rounded-lg px-2.5 py-1 ${statusStyle[appt.status]}`}>
                    <Text className={`text-xs font-semibold ${statusStyle[appt.status].split(' ')[1]}`}>
                      {appt.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-xs text-slate-400">
                  {appt.type === 'virtual' ? 'Virtual teleconsult' : 'In-person visit'}
                </Text>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
