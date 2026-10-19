import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ErrorState, IconBadge, InlineMessage, SkeletonList, Text, TextField } from '@/components/ui';
import { assignPatientPrescriptionPharmacy, listActivePharmacies } from '@/data/web/hooks/use-patient-prescriptions';
import { useQuery } from '@/hooks/use-query';
import { haptics } from '@/lib/haptics';
import { spacing } from '@/theme/tokens';

export default function PharmacyPickerSheet(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pharmacies = useQuery(() => listActivePharmacies(), []);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = pharmacies.data ?? [];
    return query ? rows.filter((row) => `${row.name} ${row.city ?? ''}`.toLowerCase().includes(query)) : rows;
  }, [pharmacies.data, search]);

  const select = async (pharmacyId: string) => {
    if (!id || sending) return;
    setSending(pharmacyId);
    setError(null);
    try {
      await assignPatientPrescriptionPharmacy(id, pharmacyId);
      haptics.success();
      router.dismissTo({ pathname: '/prescriptions/[id]', params: { id, sent: '1' } });
    } catch (assignError) {
      haptics.error();
      setError(assignError instanceof Error ? assignError.message : t('m.common.unexpected'));
      setSending(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Text variant="title">{t('patient.prescriptions.pharmacyAssignTitle')}</Text>
      <Text variant="caption" color="muted">
        {t('patient.prescriptions.pharmacyAssignSubtitle')}
      </Text>
      {(pharmacies.data?.length ?? 0) > 6 ? <TextField placeholder={t('m.common.search')} value={search} onChangeText={setSearch} /> : null}
      {error ? <InlineMessage tone="danger" message={error} /> : null}
      {pharmacies.loading ? (
        <SkeletonList count={4} height={64} />
      ) : pharmacies.error ? (
        <ErrorState message={pharmacies.error} onRetry={() => void pharmacies.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState icon="storefront-outline" title={t('patient.prescriptions.pharmacyAssignEmpty')} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visible.map((pharmacy) => (
            <Card key={pharmacy.id} onPress={() => void select(pharmacy.id)} accessibilityLabel={pharmacy.name}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge name="storefront-outline" tone="success" size={36} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{pharmacy.name}</Text>
                  {pharmacy.city ? (
                    <Text variant="caption" color="muted">
                      {pharmacy.city}
                    </Text>
                  ) : null}
                </View>
                <Text variant="captionStrong" color="primary">
                  {sending === pharmacy.id ? t('patient.prescriptions.pharmacyAssignSending') : t('patient.prescriptions.pharmacyAssignSelect')}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.md },
});
