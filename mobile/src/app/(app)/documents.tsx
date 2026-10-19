import * as WebBrowser from 'expo-web-browser';
import { Stack, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  IconButton,
  InlineMessage,
  Pill,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
  ToggleRow,
  type IconName,
} from '@/components/ui';
import {
  getPatientDocumentSignedUrl,
  recordPatientDocumentShare,
  setPatientDocumentCareTeamAccess,
  softDeletePatientDocument,
  usePatientDocumentVault,
  type PatientVaultDocument,
} from '@/data/web/hooks/use-patient-document-vault';
import { alertDialog } from '@/lib/dialog';
import { usePatientInsurance } from '@/data/web/hooks/use-patient-insurance';
import { usePatientLabResults } from '@/data/web/hooks/use-patient-lab-results';
import { usePatientPrescriptions } from '@/data/web/hooks/use-patient-prescriptions';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatBytes, formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import type { Tone } from '@/theme/tokens';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Segment = 'mine' | 'care';

interface CareDocument {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  icon: IconName;
  tone: Tone;
  href: Href;
}

export default function DocumentsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.id;
  const vault = useOfflineCache(usePatientDocumentVault(uid), uid ? `documents:${uid}` : null);
  const labs = useOfflineCache(usePatientLabResults(uid), uid ? `labs:${uid}` : null);
  const prescriptions = useOfflineCache(usePatientPrescriptions(uid), uid ? `prescriptions:${uid}` : null);
  const insurance = useOfflineCache(usePatientInsurance(uid), uid ? `insurance:${uid}` : null);
  const [segment, setSegment] = useState<Segment>('mine');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refetch } = vault;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const careDocs = useMemo<CareDocument[]>(() => {
    const rows: CareDocument[] = [
      ...(labs.data ?? []).map((order) => ({
        id: `lab-${order.id}`,
        title: `${t('patient.documents.labReport')} — ${order.items[0]?.test_name ?? t('patient.documents.labOrder')}`,
        subtitle: order.labName ?? t('patient.documents.ceenaixLab'),
        date: order.ordered_at,
        icon: 'flask-outline' as const,
        tone: 'ai' as const,
        href: {
          pathname: '/lab-results/[id]',
          params: { id: order.id },
        } as const,
      })),
      ...(prescriptions.data ?? []).map((rx) => ({
        id: `rx-${rx.id}`,
        title: `${t('patient.documents.prescription')} — ${rx.items[0]?.medication_name ?? t('shared.medicationPlan')}`,
        subtitle: rx.doctorName,
        date: rx.prescribed_at,
        icon: 'medkit-outline' as const,
        tone: 'brand' as const,
        href: {
          pathname: '/prescriptions/[id]',
          params: { id: rx.id },
        } as const,
      })),
      ...(insurance.data?.plans ?? []).map((plan) => ({
        id: `ins-${plan.id}`,
        title: `${t('patient.documents.insuranceCard')} — ${plan.planName}`,
        subtitle: plan.providerCompany,
        date: plan.validFrom ?? plan.validUntil ?? new Date().toISOString(),
        icon: 'shield-checkmark-outline' as const,
        tone: 'info' as const,
        href: '/insurance' as const,
      })),
    ];
    return rows.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [insurance.data?.plans, labs.data, prescriptions.data, t]);

  const act = async (doc: PatientVaultDocument, action: () => Promise<void>) => {
    setBusyId(doc.id);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      haptics.error();
      setError(actionError instanceof Error ? actionError.message : t('m.common.unexpected'));
    } finally {
      setBusyId(null);
    }
  };

  const open = (doc: PatientVaultDocument) =>
    act(doc, async () => {
      const url = await getPatientDocumentSignedUrl(doc.storagePath);
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    });

  const share = (doc: PatientVaultDocument) =>
    act(doc, async () => {
      const url = await getPatientDocumentSignedUrl(doc.storagePath, 3600);
      const result = await Share.share({
        title: doc.title,
        message: `${doc.title}\n${url}\n\n${t('m.docs.linkExpires')}`,
      });
      if (result.action === Share.sharedAction && user) await recordPatientDocumentShare(doc.id, user.id, 'link');
    });

  const toggleCareTeam = (doc: PatientVaultDocument, enabled: boolean) =>
    act(doc, async () => {
      haptics.tap();
      await setPatientDocumentCareTeamAccess(doc.id, enabled);
      if (enabled && user) await recordPatientDocumentShare(doc.id, user.id, 'care_team');
      await vault.refetch();
    });

  const remove = (doc: PatientVaultDocument) =>
    alertDialog(t('m.docs.remove'), t('m.docs.confirmRemove'), [
      { text: t('m.common.cancel'), style: 'cancel' },
      {
        text: t('m.docs.remove'),
        style: 'destructive',
        onPress: () =>
          void act(doc, async () => {
            await softDeletePatientDocument(doc.id);
            haptics.success();
            await vault.refetch();
          }),
      },
    ]);

  return (
    <Screen testID="screen-documents" onRefresh={vault.refetch} refreshing={vault.refreshing} staleSince={vault.staleSince}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton name="cloud-upload-outline" variant="plain" onPress={() => router.push('/document-upload')} accessibilityLabel={t('m.docs.upload')} />
          ),
        }}
      />
      <SegmentedControl<Segment>
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'mine', label: t('m.docs.mine'), count: vault.data?.length },
          {
            value: 'care',
            label: t('m.docs.fromCare'),
            count: careDocs.length,
          },
        ]}
      />
      {error ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineMessage tone="danger" message={error} />
        </View>
      ) : null}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {segment === 'mine' ? (
          vault.loading ? (
            <SkeletonList count={3} height={130} />
          ) : !vault.data && vault.error ? (
            <ErrorState message={vault.error} onRetry={() => void vault.refetch()} />
          ) : (vault.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title={t('m.docs.noUploadsTitle')}
              body={t('m.docs.noUploadsBody')}
              action={{
                label: t('m.docs.uploadTitle'),
                onPress: () => router.push('/document-upload'),
              }}
            />
          ) : (
            vault.data?.map((doc) => (
              <Card key={doc.id}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <IconBadge name={doc.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} tone="warning" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {doc.title}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      {t('m.docs.uploadedOn', {
                        date: formatDate(doc.createdAt),
                      })}{' '}
                      · {formatBytes(doc.fileSizeBytes)}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: spacing.xs,
                        marginTop: 4,
                      }}
                    >
                      <Pill label={t(`m.docs.categories.${doc.category}`)} tone="neutral" />
                    </View>
                  </View>
                </View>
                {doc.description ? (
                  <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
                    {doc.description}
                  </Text>
                ) : null}
                <ToggleRow
                  label={t('m.docs.careTeam')}
                  description={doc.allowCareTeamAccess ? t('m.docs.shared') : t('m.docs.private')}
                  value={doc.allowCareTeamAccess}
                  disabled={busyId === doc.id}
                  onChange={(enabled) => void toggleCareTeam(doc, enabled)}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('m.docs.open')}
                      icon="eye-outline"
                      size="sm"
                      variant="secondary"
                      fullWidth
                      disabled={busyId === doc.id}
                      onPress={() => void open(doc)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('m.docs.share')}
                      icon="share-outline"
                      size="sm"
                      variant="secondary"
                      fullWidth
                      disabled={busyId === doc.id}
                      onPress={() => void share(doc)}
                    />
                  </View>
                  <IconButton name="trash-outline" variant="plain" onPress={() => remove(doc)} accessibilityLabel={t('m.docs.remove')} />
                </View>
              </Card>
            ))
          )
        ) : labs.loading && prescriptions.loading ? (
          <SkeletonList count={4} height={72} />
        ) : careDocs.length === 0 ? (
          <EmptyState icon="documents-outline" title={t('patient.documents.noDocsTitle')} body={t('patient.documents.noDocsBody')} />
        ) : (
          careDocs.map((doc) => (
            <Card key={doc.id} onPress={() => router.push(doc.href)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <IconBadge name={doc.icon} tone={doc.tone} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {doc.title}
                  </Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {doc.subtitle} · {formatDate(doc.date)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
