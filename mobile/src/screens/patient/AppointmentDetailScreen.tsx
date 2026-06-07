import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, EmptyState, ErrorState, Screen, Skeleton } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import { usePatientAppointments } from '../../hooks/use-patient-appointments';
import { colors } from '../../lib/theme';
import type { AppointmentsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppointmentsStackParamList, 'AppointmentDetail'>;

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View className="flex-row justify-between border-t border-slate-50 py-2.5">
      <Text className="text-xs font-medium text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

export function AppointmentDetailScreen({ route }: Props): React.ReactElement {
  const { id } = route.params;
  const { user } = useAuth();
  const { data, loading, error, refetch } = usePatientAppointments(user?.id);
  const onRefresh = useCallback(() => refetch(), [refetch]);

  const appointment = (data ?? []).find((appt) => appt.id === id) ?? null;

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.brand[600]} />}>
      {error ? <ErrorState message={error} onRetry={refetch} /> : null}
      {loading && !data ? (
        <Skeleton className="mt-2 h-48 w-full" />
      ) : appointment ? (
        <Card className="mt-2">
          <Text className="text-lg font-bold text-slate-900">{appointment.doctorName}</Text>
          {appointment.doctorSpecialty ? (
            <Text className="text-sm font-medium text-brand-600">{appointment.doctorSpecialty}</Text>
          ) : null}
          <View className="mt-3">
            <Row
              label="Date"
              value={new Date(appointment.scheduled_at).toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
            <Row
              label="Time"
              value={new Date(appointment.scheduled_at).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            />
            <Row label="Type" value={appointment.type === 'virtual' ? 'Virtual teleconsult' : 'In-person visit'} />
            <Row label="Status" value={appointment.status.replace('_', ' ')} />
            {appointment.chief_complaint ? <Row label="Reason" value={appointment.chief_complaint} /> : null}
          </View>
        </Card>
      ) : !loading ? (
        <EmptyState title="Appointment not found" />
      ) : null}
    </Screen>
  );
}
