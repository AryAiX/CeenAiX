import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  ChoiceChips,
  EmptyState,
  ErrorState,
  IconBadge,
  KeyValue,
  Pill,
  ProgressBar,
  Screen,
  Section,
  SegmentedControl,
  Skeleton,
  Text,
  type IconName,
} from '@/components/ui';
import { usePatientInsurance, type PatientInsuranceActivity } from '@/data/web/hooks/use-patient-insurance';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatAed, formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import type { Tone } from '@/theme/tokens';
import { radius, spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'activity' | 'benefits';
type StatusFilter = 'all' | PatientInsuranceActivity['status'];

const STATUS_TONE: Record<PatientInsuranceActivity['status'], Tone> = {
  approved: 'success',
  pending: 'warning',
  review: 'info',
  denied: 'danger',
};

export default function InsuranceScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insurance = useOfflineCache(usePatientInsurance(user?.id), user ? `insurance:${user.id}` : null);
  const [segment, setSegment] = useState<Segment>('activity');
  const [status, setStatus] = useState<StatusFilter>('all');

  const plan = insurance.data?.primaryPlan ?? null;
  const activity = useMemo(() => insurance.data?.activity ?? [], [insurance.data?.activity]);
  const visible = useMemo(() => activity.filter((row) => status === 'all' || row.status === status), [activity, status]);
  const totals = useMemo(
    () =>
      activity.reduce((sum, row) => ({ covered: sum.covered + row.coveredEstimate, patient: sum.patient + row.patientShareEstimate }), {
        covered: 0,
        patient: 0,
      }),
    [activity]
  );

  if (insurance.loading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md }}>
          <Skeleton height={190} rounded={radius.xl} />
          <Skeleton height={100} />
          <Skeleton height={200} />
        </View>
      </Screen>
    );
  }
  if (!insurance.data && insurance.error) {
    return (
      <Screen>
        <ErrorState message={t('patient.insurance.loadError')} onRetry={() => void insurance.refetch()} />
      </Screen>
    );
  }

  const coPay = plan?.coPayPercent ?? null;
  const covered = coPay == null ? null : Math.max(0, 100 - coPay);
  const limit = plan?.annualLimit ?? null;
  const used = plan?.annualLimitUsed ?? 0;
  const memberId = plan?.memberId ?? plan?.policyNumber ?? null;

  const shareCard = () =>
    void Share.share({
      message: [
        t('patient.insurance.docCard'),
        `${plan?.providerCompany ?? '—'} · ${plan?.planName ?? '—'}`,
        `${t('patient.insurance.member')}: ${insurance.data?.patientName ?? '—'}`,
        `ID: ${memberId ?? '—'}`,
        `${t('patient.insurance.validUntil')}: ${plan?.validUntil ? formatDate(plan.validUntil) : '—'}`,
      ].join('\n'),
    });

  const contactInsurer = () => {
    const subject = encodeURIComponent(`Insurance inquiry — ${memberId ?? 'member'}`);
    const body = encodeURIComponent(`Plan: ${plan?.planName ?? '—'}\nMember ID: ${plan?.memberId ?? '—'}\nPolicy: ${plan?.policyNumber ?? '—'}\n\n`);
    void Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };

  const benefits: Array<{ icon: IconName; name: string; value: string; note: string }> = [
    {
      icon: 'medkit-outline',
      name: t('patient.insurance.benefitSpecialists'),
      value: covered == null ? '—' : `${covered}%`,
      note: t('patient.insurance.benefitSpecialistsNote'),
    },
    {
      icon: 'flask-outline',
      name: t('patient.insurance.benefitLabs'),
      value: covered == null ? '—' : `${covered}%`,
      note: t('patient.insurance.benefitLabsNote'),
    },
    {
      icon: 'bandage-outline',
      name: t('patient.insurance.benefitPharmacy'),
      value: t('patient.insurance.pharmacyCoPayNote'),
      note: t('patient.insurance.benefitPharmacyNote'),
    },
    {
      icon: 'videocam-outline',
      name: t('patient.insurance.benefitTelehealth'),
      value: covered == null ? '—' : `${covered}%`,
      note: t('patient.insurance.benefitTelehealthNote'),
    },
    {
      icon: 'heart-outline',
      name: t('patient.insurance.benefitPreventive'),
      value: t('patient.insurance.noCopay'),
      note: t('patient.insurance.benefitPreventiveNote'),
    },
  ];

  return (
    <Screen onRefresh={insurance.refetch} refreshing={insurance.refreshing} staleSince={insurance.staleSince}>
      {plan ? (
        <View style={{ borderRadius: radius.xl, padding: spacing.xl, backgroundColor: colors.primary, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text variant="micro" style={{ color: colors.primaryText, opacity: 0.8 }}>
                {plan.providerCompany}
              </Text>
              <Text variant="title" style={{ color: colors.primaryText }}>
                {plan.planName}
              </Text>
            </View>
            <Pill
              label={plan.isActive ? t('patient.insurance.activeBadge') : t('patient.insurance.notLinkedBadge')}
              tone={plan.isActive ? 'success' : 'neutral'}
            />
          </View>
          <View>
            <Text variant="micro" style={{ color: colors.primaryText, opacity: 0.8 }}>
              {t('patient.insurance.member')}
            </Text>
            <Text variant="bodyStrong" style={{ color: colors.primaryText }}>
              {insurance.data?.patientName ?? t('patient.insurance.memberNameMissing')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="micro" style={{ color: colors.primaryText, opacity: 0.8 }}>
                ID
              </Text>
              <Text variant="bodyStrong" style={{ color: colors.primaryText, letterSpacing: 1 }}>
                {memberId ?? '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="micro" style={{ color: colors.primaryText, opacity: 0.8 }}>
                {t('patient.insurance.validUntil')}
              </Text>
              <Text variant="bodyStrong" style={{ color: colors.primaryText }}>
                {plan.validUntil ? formatDate(plan.validUntil) : '—'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <EmptyState
          icon="shield-outline"
          title={t('patient.insurance.noInsuranceProvider')}
          body={t('patient.insurance.noPlan')}
          action={{ label: t('nav.profile'), onPress: () => router.push('/profile') }}
        />
      )}

      {plan ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            {plan.cardPhotoUrl ? (
              <View style={{ flex: 1 }}>
                <Button
                  label={t('patient.insurance.viewDocument')}
                  icon="card-outline"
                  size="sm"
                  variant="secondary"
                  fullWidth
                  onPress={() => void WebBrowser.openBrowserAsync(plan.cardPhotoUrl ?? '')}
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button label={t('m.common.share')} icon="share-outline" size="sm" variant="secondary" fullWidth onPress={shareCard} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('patient.insurance.contactInsurer')} icon="mail-outline" size="sm" variant="secondary" fullWidth onPress={contactInsurer} />
            </View>
          </View>

          <Card style={{ marginTop: spacing.lg }}>
            <KeyValue label={t('patient.insurance.coverage')} value={plan.coverageType ?? t('patient.insurance.coverageNotRecorded')} />
            <KeyValue label={t('patient.insurance.copay')} value={coPay == null ? '—' : t('patient.insurance.coPayPct', { percent: coPay })} />
            {limit ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="muted">
                    {t('patient.insurance.usedThisYear')}
                  </Text>
                  <Text variant="captionStrong">
                    {formatAed(used)} / {formatAed(limit)}
                  </Text>
                </View>
                <ProgressBar value={used / limit} tone={used / limit > 0.8 ? 'warning' : 'brand'} />
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      <Section>
        <SegmentedControl<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'activity', label: t('patient.insurance.tabClaims'), count: activity.length },
            { value: 'benefits', label: t('patient.insurance.tabBenefits') },
          ]}
        />
      </Section>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {segment === 'benefits' ? (
          benefits.map((benefit) => (
            <Card key={benefit.name}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge name={benefit.icon} tone="brand" size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      {benefit.name}
                    </Text>
                    <Text variant="captionStrong" color="primary">
                      {benefit.value}
                    </Text>
                  </View>
                  <Text variant="caption" color="muted">
                    {benefit.note}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <>
            {activity.length > 0 ? (
              <Card>
                <KeyValue label={t('patient.insurance.planCovered')} value={formatAed(totals.covered)} />
                <KeyValue label={t('patient.insurance.youPaid')} value={formatAed(totals.patient)} />
              </Card>
            ) : null}
            <ChoiceChips<StatusFilter>
              options={[
                { value: 'all', label: t('patient.insurance.filterAll') },
                { value: 'approved', label: t('patient.insurance.status.approved') },
                { value: 'pending', label: t('patient.insurance.status.pending') },
                { value: 'review', label: t('patient.insurance.status.review') },
                { value: 'denied', label: t('patient.insurance.status.denied') },
              ]}
              selected={[status]}
              onToggle={setStatus}
            />
            {visible.length === 0 ? (
              <EmptyState icon="receipt-outline" title={t('patient.insurance.noActivity')} />
            ) : (
              visible.map((row) => (
                <Card key={row.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {row.service}
                      </Text>
                      <Text variant="caption" color="muted" numberOfLines={1}>
                        {row.provider} · {formatDate(row.date)}
                      </Text>
                    </View>
                    <Pill label={t(`patient.insurance.status.${row.status}`)} tone={STATUS_TONE[row.status]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                    <Text variant="micro" color="subtle">
                      {row.referenceCode}
                    </Text>
                    <Text variant="captionStrong">
                      {t('patient.insurance.patientShare')}: {formatAed(row.patientShareEstimate)}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
