import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppointmentCard } from '@/components/appointment-card';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconBadge,
  IconButton,
  InlineMessage,
  Pill,
  ProgressBar,
  Screen,
  Section,
  Skeleton,
  SkeletonList,
  Text,
  type IconName,
} from '@/components/ui';
import { useMedicationLogs } from '@/data/web/hooks/use-medication-logs';
import { usePatientDashboard, type PatientDashboardData } from '@/data/web/hooks/use-patient-dashboard';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { useNow } from '@/hooks/use-now';
import { formatAed, formatDate, formatDateLong, formatNumber, formatRelative } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { webPathToHref } from '@/lib/links';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, type Tone } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const firstName = (fullName: string | null | undefined, first: string | null | undefined) => first?.trim() || fullName?.trim().split(/\s+/)[0] || '';

export default function HomeScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { unreadNotifications } = useBadges();
  const now = useNow();
  const dashboard = useOfflineCache(usePatientDashboard(user?.id, i18n.language), user ? `dashboard:${user.id}:${i18n.language}` : null);
  const medicationLogs = useMedicationLogs(user?.id);
  const data = dashboard.data;

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t('m.home.morning') : hour < 18 ? t('m.home.afternoon') : t('m.home.evening');
  const name = firstName(profile?.full_name, profile?.first_name) || t('patient.dashboard.greetingFallback');

  return (
    <Screen edgeTop onRefresh={dashboard.refetch} refreshing={dashboard.refreshing} staleSince={dashboard.staleSince}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('nav.profile')} onPress={() => router.push('/profile')}>
          <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={46} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="muted">
            {formatDateLong(new Date(now))}
          </Text>
          <Text variant="title" numberOfLines={1}>
            {greeting}, {name}
          </Text>
        </View>
        <IconButton
          name="notifications-outline"
          accessibilityLabel={t('nav.notifications')}
          badge={unreadNotifications}
          onPress={() => router.push('/notifications')}
        />
      </View>

      {dashboard.loading ? (
        <HomeSkeleton />
      ) : !data && dashboard.error ? (
        <ErrorState message={t('patient.dashboard.loadError')} onRetry={() => void dashboard.refetch()} />
      ) : data ? (
        <>
          {dashboard.error && !dashboard.staleSince ? <InlineMessage tone="warning" message={t('patient.dashboard.loadError')} /> : null}
          <NextAppointment data={data} now={now} />
          <QuickActions />
          <Vitals data={data} takenIds={medicationLogs.takenItemIds} />
          <Medications
            data={data}
            takenIds={medicationLogs.takenItemIds}
            error={medicationLogs.error}
            onMarkTaken={async (id) => {
              try {
                await medicationLogs.markTaken(id);
                haptics.success();
              } catch {
                haptics.error();
              }
            }}
          />
          {data.allergyAlerts.length > 0 ? (
            <Section title={t('m.home.allergyAlerts')}>
              <View style={{ gap: spacing.sm }}>
                {data.allergyAlerts.map((allergy) => (
                  <Card key={allergy.id} tone="danger">
                    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                      <Icon name="warning" color={colors.tones.danger.fg} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" color="danger">
                          {allergy.allergen}
                        </Text>
                        {allergy.reaction ? (
                          <Text variant="caption" color="danger">
                            {allergy.reaction}
                          </Text>
                        ) : null}
                      </View>
                      <Pill label={allergy.severity} tone="danger" />
                    </View>
                  </Card>
                ))}
              </View>
            </Section>
          ) : null}
          <Messages data={data} />
          <Activity data={data} />
          <CareTeam data={data} />
          {data.insurance ? <Insurance insurance={data.insurance} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

function HomeSkeleton(): React.ReactElement {
  return (
    <View style={{ gap: spacing.lg }}>
      <Skeleton height={168} rounded={radius.xl} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} width={72} height={72} rounded={radius.lg} />
        ))}
      </View>
      <SkeletonList count={3} />
    </View>
  );
}

function NextAppointment({ data, now }: { data: PatientDashboardData; now: number }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const next = data.nextAppointment;
  return (
    <Section
      title={t('patient.dashboard.nextAppointment')}
      action={{ label: t('patient.dashboard.viewAll'), onPress: () => router.push('/appointments') }}
      style={{ marginTop: spacing.lg }}
    >
      {next ? (
        <AppointmentCard
          appointment={{ id: next.id, type: next.type, status: 'scheduled', scheduled_at: next.scheduledAt, duration_minutes: 30, chief_complaint: null }}
          doctorName={next.doctorName}
          specialty={next.specialty}
          now={now}
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title={t('patient.dashboard.noUpcomingTitle')}
          body={t('patient.dashboard.noUpcomingBody')}
          action={{ label: t('patient.appointments.book'), onPress: () => router.push('/book') }}
        />
      )}
    </Section>
  );
}

function QuickActions(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const actions: Array<{ icon: IconName; label: string; tone: Tone; onPress: () => void }> = [
    { icon: 'calendar', label: t('m.home.quickBook'), tone: 'brand', onPress: () => router.push('/book') },
    { icon: 'chatbubbles', label: t('m.home.quickMessage'), tone: 'info', onPress: () => router.push('/messages') },
    { icon: 'flask', label: t('m.home.quickLabs'), tone: 'ai', onPress: () => router.push('/lab-results') },
    { icon: 'sparkles', label: t('m.home.quickAi'), tone: 'neutral', onPress: () => router.push('/assistant') },
  ];
  return (
    <View style={styles.quickRow}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            haptics.tap();
            action.onPress();
          }}
          style={({ pressed }) => [styles.quick, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
        >
          <IconBadge name={action.icon} tone={action.tone} size={40} />
          <Text variant="micro" numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatTile({ icon, tone, label, value, badge }: { icon: IconName; tone: Tone; label: string; value: string; badge?: string }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconBadge name={icon} tone={tone} size={32} />
      <Text variant="caption" color="muted" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" numberOfLines={1}>
        {value}
      </Text>
      {badge ? <Pill label={badge} tone={tone} /> : null}
    </View>
  );
}

function Vitals({ data, takenIds }: { data: PatientDashboardData; takenIds: Set<string> }): React.ReactElement {
  const { t } = useTranslation();
  const taken = data.medications.filter((medication) => medication.isDispensed || takenIds.has(medication.id)).length;
  const bp = data.latestBloodPressure;
  const labs = data.labsSummary;
  return (
    <Section title={t('m.home.healthScore')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
        <StatTile
          icon="pulse"
          tone="brand"
          label={t('m.home.healthScore')}
          value={formatNumber(data.healthScore)}
          badge={data.adherencePercentage !== null ? `${t('m.home.adherence')} ${formatNumber(data.adherencePercentage)}%` : undefined}
        />
        <StatTile
          icon="water"
          tone="warning"
          label={t('m.home.hba1c')}
          value={data.latestHba1c ? `${formatNumber(data.latestHba1c.value)}%` : '—'}
          badge={data.latestHba1c ? (data.latestHba1c.value >= 6.5 ? t('m.home.attention') : t('m.home.normal')) : t('m.home.noData')}
        />
        <StatTile
          icon="heart"
          tone="danger"
          label={t('m.home.bloodPressure')}
          value={bp ? `${formatNumber(bp.systolic)}/${formatNumber(bp.diastolic)}` : '—'}
          badge={bp ? (bp.systolic <= 130 && bp.diastolic <= 85 ? t('m.home.controlled') : t('m.home.attention')) : t('m.home.noData')}
        />
        <StatTile
          icon="flask"
          tone="info"
          label={t('m.home.lastLabs')}
          value={labs.latestStatus === 'attention' ? t('m.home.attention') : labs.latestStatus === 'normal' ? t('m.home.normal') : '—'}
          badge={labs.latestRecordedAt ? formatDate(labs.latestRecordedAt) : t('m.home.noData')}
        />
        <StatTile
          icon="medkit"
          tone="success"
          label={t('m.home.medications')}
          value={data.medications.length > 0 ? `${formatNumber(taken)}/${formatNumber(data.medications.length)}` : formatNumber(0)}
          badge={t('m.home.today')}
        />
      </ScrollView>
    </Section>
  );
}

function Medications({
  data,
  takenIds,
  error,
  onMarkTaken,
}: {
  data: PatientDashboardData;
  takenIds: Set<string>;
  error: string | null;
  onMarkTaken: (id: string) => Promise<void>;
}): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language.startsWith('ar');
  const medications = data.medications.slice(0, 4);
  const taken = data.medications.filter((medication) => medication.isDispensed || takenIds.has(medication.id)).length;
  return (
    <Section title={t('m.home.todaysMedications')} action={{ label: t('patient.dashboard.viewAll'), onPress: () => router.push('/prescriptions') }}>
      {medications.length === 0 ? (
        <EmptyState icon="medkit-outline" title={t('patient.dashboard.noMedTitle')} body={t('patient.dashboard.noMedBody')} />
      ) : (
        <Card>
          <Text variant="caption" color="muted">
            {t('m.home.takenOf', { taken: formatNumber(taken), total: formatNumber(data.medications.length) })}
          </Text>
          <View style={{ marginVertical: spacing.sm }}>
            <ProgressBar value={data.medications.length ? taken / data.medications.length : 0} tone="success" />
          </View>
          {medications.map((medication) => {
            const isTaken = medication.isDispensed || takenIds.has(medication.id);
            return (
              <View key={medication.id} style={styles.medRow}>
                <IconBadge name="medical" tone={isTaken ? 'success' : 'brand'} size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {(isArabic && medication.medicationNameAr) || medication.medicationName}
                  </Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {[medication.dosage, medication.frequencyFromVocab ?? medication.frequency, medication.durationFromVocab ?? medication.duration]
                      .filter(Boolean)
                      .join(' · ') || medication.detail}
                  </Text>
                </View>
                {isTaken ? (
                  <Pill
                    label={medication.isDispensed && !takenIds.has(medication.id) ? t('m.home.dispensed') : t('m.home.taken')}
                    tone="success"
                    icon="checkmark"
                  />
                ) : (
                  <Button size="sm" variant="secondary" label={t('m.home.markTaken')} onPress={() => void onMarkTaken(medication.id)} />
                )}
              </View>
            );
          })}
          {error ? <InlineMessage tone="danger" message={t('patient.prescriptions.medicationLogError', { defaultValue: error })} /> : null}
        </Card>
      )}
    </Section>
  );
}

function Messages({ data }: { data: PatientDashboardData }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Section title={t('m.home.messagesTitle')} action={{ label: t('patient.dashboard.viewAll'), onPress: () => router.push('/messages') }}>
      {data.recentMessages.length === 0 ? (
        <Card>
          <Text variant="caption" color="muted">
            {t('m.home.noMessages')}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data.recentMessages.map((message) => (
            <Card key={message.id} onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: message.conversationId } })}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <Avatar name={message.senderName} size={38} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {message.senderName}
                    </Text>
                    <Text variant="micro" color="subtle">
                      {formatRelative(message.sentAt)}
                    </Text>
                  </View>
                  <Text variant="caption" color={message.isRead ? 'muted' : 'default'} numberOfLines={1}>
                    {message.body}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Section>
  );
}

function Activity({ data }: { data: PatientDashboardData }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Section title={t('patient.dashboard.recentActivity')}>
      {data.recentActivity.length === 0 ? (
        <EmptyState icon="time-outline" title={t('patient.dashboard.noActivityTitle')} body={t('patient.dashboard.noActivityBody')} />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {data.recentActivity.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              disabled={!item.actionUrl}
              onPress={() => {
                const href = webPathToHref(item.actionUrl);
                if (href) router.push(href);
              }}
              style={[styles.activityRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <IconBadge name={activityIcon(item.type)} size={34} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.detail ? (
                  <Text variant="caption" color="muted" numberOfLines={2}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
              <Text variant="micro" color="subtle">
                {formatRelative(item.createdAt)}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}
    </Section>
  );
}

const activityIcon = (type: string): IconName => {
  if (type === 'appointment') return 'calendar';
  if (type === 'lab_result') return 'flask';
  if (type === 'prescription') return 'medkit';
  if (type === 'message') return 'chatbubble';
  return 'notifications';
};

function CareTeam({ data }: { data: PatientDashboardData }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Section title={t('m.home.careTeam')}>
      {data.careTeam.length === 0 ? (
        <Card>
          <Text variant="caption" color="muted">
            {t('m.home.noCareTeam')}
          </Text>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {data.careTeam.map((member) => (
            <Card key={member.doctorId} style={{ width: 200 }} onPress={() => router.push({ pathname: '/book', params: { doctor: member.doctorId } })}>
              <Avatar name={member.doctorName} size={40} />
              <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.sm }}>
                {member.doctorName}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {member.specialty || t('shared.generalPractice')}
              </Text>
              <Text variant="micro" color="subtle" style={{ marginTop: spacing.xs }}>
                {member.nextAppointmentAt
                  ? t('m.home.nextVisit', { date: formatDate(member.nextAppointmentAt) })
                  : member.lastAppointmentAt
                    ? t('m.home.lastVisit', { date: formatDate(member.lastAppointmentAt) })
                    : ' '}
              </Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </Section>
  );
}

function Insurance({ insurance }: { insurance: NonNullable<PatientDashboardData['insurance']> }): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const used = insurance.annualLimit && insurance.annualLimit > 0 ? Math.min(1, insurance.annualLimitUsed / insurance.annualLimit) : 0;
  return (
    <Section title={t('m.home.insuranceTitle')}>
      <Card onPress={() => router.push('/insurance')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconBadge name="shield-checkmark" tone="info" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {insurance.providerCompany}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {insurance.planName}
            </Text>
          </View>
          <Pill label={insurance.isActive ? t('m.home.insuranceActive') : t('m.home.insuranceExpired')} tone={insurance.isActive ? 'success' : 'neutral'} />
        </View>
        {insurance.annualLimit ? (
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color="muted">
                {t('m.home.annualLimitUsed')}
              </Text>
              <Text variant="captionStrong">{formatNumber(Math.round(used * 100))}%</Text>
            </View>
            <ProgressBar value={used} tone="info" />
            <Text variant="micro" color="subtle">
              {t('m.home.remaining', { amount: formatAed(insurance.remainingAmount) })}
            </Text>
          </View>
        ) : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    width: 148,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
