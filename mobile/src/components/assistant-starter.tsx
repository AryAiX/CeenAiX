import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Icon, InlineMessage, Text } from '@/components/ui';
import type { PatientDashboardData } from '@/data/web/hooks/use-patient-dashboard';
import { formatShortDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

// Same thresholds as the web AI chat health summary.
const hba1cTrend = (latest: number | null, previous: number | null) => {
  if (latest === null) return null;
  if (previous === null) return 'baseline' as const;
  const delta = latest - previous;
  return delta <= -0.2 ? ('improving' as const) : delta >= 0.2 ? ('rising' as const) : ('stable' as const);
};

const bloodPressureClass = (systolic: number | null, diastolic: number | null) => {
  if (!systolic || !diastolic) return null;
  if (systolic < 130 && diastolic < 85) return 'controlled' as const;
  if (systolic < 140 && diastolic < 90) return 'elevated' as const;
  return 'uncontrolled' as const;
};

interface AssistantStarterProps {
  firstName: string;
  dashboard: PatientDashboardData | null;
  consentUnset: boolean;
  onConsent: (granted: boolean) => void;
  onPrompt: (prompt: string) => void;
  preVisitId: string | null;
}

export function AssistantStarter({ firstName, dashboard, consentUnset, onConsent, onPrompt, preVisitId }: AssistantStarterProps): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const latestHba1c = dashboard?.latestHba1c?.value ?? null;
  const trend = hba1cTrend(latestHba1c, dashboard?.previousHba1c?.value ?? null);
  const bp = dashboard?.latestBloodPressure ?? null;
  const bpClass = bloodPressureClass(bp?.systolic ?? null, bp?.diastolic ?? null);
  const medications = dashboard?.medications.length ?? 0;
  const next = dashboard?.nextAppointment ?? null;
  const allergies = (dashboard?.allergyAlerts ?? []).map((allergy) => allergy.allergen).filter(Boolean).slice(0, 3);

  const trendLabel =
    trend === 'improving'
      ? t('patient.aiChat.hba1cImproving')
      : trend === 'rising'
        ? t('patient.aiChat.hba1cRising')
        : trend === 'stable'
          ? t('patient.aiChat.hba1cStable')
          : trend === 'baseline'
            ? t('patient.aiChat.hba1cBaseline', { defaultValue: 'Baseline reading on file' })
            : null;
  const bpLabel =
    bpClass === 'controlled'
      ? t('patient.aiChat.bpControlled')
      : bpClass === 'elevated'
        ? t('patient.aiChat.bpElevated')
        : bpClass === 'uncontrolled'
          ? t('patient.aiChat.bpUncontrolled')
          : null;

  const metrics = [
    { label: t('patient.aiChat.labelHba1c'), value: latestHba1c !== null ? `${latestHba1c}%` : t('patient.aiChat.metricNone'), note: trendLabel },
    { label: t('patient.aiChat.labelBloodPressure'), value: bp ? `${bp.systolic}/${bp.diastolic}` : t('patient.aiChat.metricNone'), note: bpLabel },
    {
      label: t('patient.aiChat.labelMedications'),
      value: String(medications),
      note: medications > 0 ? t('patient.aiChat.medsActive') : t('patient.aiChat.medsInactive'),
    },
    {
      label: t('patient.aiChat.labelNextVisit'),
      value: next ? formatShortDay(next.scheduledAt) : t('patient.aiChat.metricNone'),
      note: next ? t('patient.aiChat.nextVisitWithDoctor', { name: next.doctorName }) : t('patient.aiChat.nextVisitNone'),
    },
  ];

  const prompts = [
    t('patient.aiChat.pillMedications'),
    t('patient.aiChat.pillDrugInteractions'),
    t('patient.aiChat.pillLabResults'),
    t('patient.aiChat.pillBloodPressure'),
    t('patient.aiChat.pillPrepareVisit'),
    t('patient.aiChat.pillReviewHistory'),
    t('patient.aiChat.pillHba1c'),
    t('patient.aiChat.pillLifestyle'),
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">{t('patient.aiChat.greeting', { name: firstName })}</Text>
        <Text variant="body" color="muted">
          {t('patient.aiChat.howCanHelp')}
        </Text>
      </View>

      {consentUnset ? (
        <Card tone="ai">
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Icon name="shield-checkmark-outline" color={colors.tones.ai.fg} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t('m.assistant.consentTitle')}
              </Text>
            </View>
            <Text variant="caption" color="muted">
              {t('m.assistant.consentBody')}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={t('m.assistant.allow')} variant="ai" size="sm" onPress={() => onConsent(true)} />
              <Button label={t('m.assistant.notNow')} variant="ghost" size="sm" onPress={() => onConsent(false)} />
            </View>
          </View>
        </Card>
      ) : null}

      <InlineMessage tone="info" message={t('patient.aiChat.safety')} />

      {dashboard ? (
        <Card>
          <Text variant="captionStrong" color="muted" style={{ marginBottom: spacing.md }}>
            {t('patient.aiChat.healthSummary')}
          </Text>
          <View style={styles.grid}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metric}>
                <Text variant="micro" color="subtle">
                  {metric.label}
                </Text>
                <Text variant="heading" numberOfLines={1}>
                  {metric.value}
                </Text>
                {metric.note ? (
                  <Text variant="micro" color="muted" numberOfLines={1}>
                    {metric.note}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          <Text variant="caption" color={allergies.length > 0 ? 'danger' : 'muted'} style={{ marginTop: spacing.md }}>
            {allergies.length > 0 ? t('patient.aiChat.allergyAlert', { allergens: allergies.join(' · ') }) : t('patient.aiChat.allergyNone')}
          </Text>
        </Card>
      ) : null}

      {preVisitId ? (
        <Button label={t('patient.aiChat.continuePreVisit')} icon="clipboard-outline" variant="secondary" fullWidth onPress={() => router.push(`/pre-visit/${preVisitId}`)} />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="captionStrong" color="muted">
          {t('patient.aiChat.tryAsking')}
        </Text>
        <View style={styles.prompts}>
          {prompts.map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              onPress={() => {
                haptics.tap();
                onPrompt(prompt);
              }}
              style={({ pressed }) => [styles.prompt, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 }]}
            >
              <Text variant="caption">{prompt}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  metric: { width: '50%', gap: 2, paddingEnd: spacing.sm },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  prompt: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
