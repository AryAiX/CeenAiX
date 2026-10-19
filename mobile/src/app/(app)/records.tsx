import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Card,
  EmptyState,
  ErrorState,
  IconBadge,
  IconButton,
  Pill,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
  TextField,
  type IconName,
} from '@/components/ui';
import type { RecordCategory } from '@/data/records';
import { usePatientRecords } from '@/data/web/hooks/use-patient-records';
import { useOfflineCache } from '@/hooks/use-offline-cache';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { spacing, type Tone } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type Filter = 'all' | RecordCategory;

interface Entry {
  id: string;
  category: RecordCategory;
  title: string;
  subtitle: string | null;
  status: string;
  statusTone: Tone;
  meta: string | null;
  sortValue: string;
}

const CATEGORY_ICON: Record<RecordCategory, { icon: IconName; tone: Tone }> = {
  condition: { icon: 'pulse-outline', tone: 'brand' },
  allergy: { icon: 'warning-outline', tone: 'warning' },
  vaccination: { icon: 'shield-checkmark-outline', tone: 'ai' },
};

export default function RecordsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const records = useOfflineCache(usePatientRecords(user?.id), user ? `records:${user.id}` : null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const { refetch } = records;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const entries = useMemo<Entry[]>(() => {
    if (!records.data) return [];
    const { conditions, allergies, vaccinations } = records.data;
    const conditionStatus = {
      active: t('patient.records.statusActive'),
      chronic: t('patient.records.statusChronic'),
      resolved: t('patient.records.statusResolved'),
    } as const;
    const severity = {
      mild: t('patient.records.severityMild'),
      moderate: t('patient.records.severityModerate'),
      severe: t('patient.records.severitySevere'),
    } as const;
    return [
      ...conditions.map<Entry>((condition) => ({
        id: condition.id,
        category: 'condition',
        title: condition.condition_name,
        subtitle: condition.icd_code ? t('patient.records.icdPrefix', { code: condition.icd_code }) : condition.notes,
        status: conditionStatus[condition.status],
        statusTone: condition.status === 'resolved' ? 'success' : condition.status === 'chronic' ? 'warning' : 'brand',
        meta: condition.diagnosed_date ? formatDate(condition.diagnosed_date) : null,
        sortValue: condition.diagnosed_date ?? condition.created_at,
      })),
      ...allergies.map<Entry>((allergy) => ({
        id: allergy.id,
        category: 'allergy',
        title: allergy.allergen,
        subtitle: allergy.reaction ? t('patient.records.reactionPrefix', { reaction: allergy.reaction }) : null,
        status: severity[allergy.severity],
        statusTone: allergy.severity === 'severe' ? 'danger' : allergy.severity === 'moderate' ? 'warning' : 'neutral',
        meta: allergy.confirmed_by_doctor ? t('patient.records.doctorConfirmed') : t('patient.records.selfReported'),
        sortValue: allergy.created_at,
      })),
      ...vaccinations.map<Entry>((vaccination) => ({
        id: vaccination.id,
        category: 'vaccination',
        title: vaccination.vaccine_name,
        subtitle: vaccination.next_dose_due
          ? t('patient.records.nextDoseLine', { date: formatDate(vaccination.next_dose_due) })
          : t('patient.records.noNextDose'),
        status: vaccination.dose_number ? t('patient.records.doseN', { n: vaccination.dose_number }) : t('patient.records.recorded'),
        statusTone: vaccination.next_dose_due ? 'warning' : 'success',
        meta: vaccination.administered_date ? formatDate(vaccination.administered_date) : null,
        sortValue: vaccination.administered_date ?? vaccination.created_at,
      })),
    ].sort((left, right) => new Date(right.sortValue).getTime() - new Date(left.sortValue).getTime());
  }, [records.data, t]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (filter === 'all' || entry.category === filter) &&
        (!query || [entry.title, entry.subtitle, entry.status].some((value) => value?.toLowerCase().includes(query)))
    );
  }, [entries, filter, search]);

  const counts = {
    condition: records.data?.conditions.length ?? 0,
    allergy: records.data?.allergies.length ?? 0,
    vaccination: records.data?.vaccinations.length ?? 0,
  };

  const openForm = (category: RecordCategory, id?: string) =>
    router.push({ pathname: '/record-form', params: id ? { category, id } : { category } });

  const promptAdd = () => {
    const options: Array<{ label: string; category: RecordCategory }> = [
      { label: t('patient.records.addCondition'), category: 'condition' },
      { label: t('patient.records.addAllergy'), category: 'allergy' },
      { label: t('patient.records.addVax'), category: 'vaccination' },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options.map((option) => option.label), t('patient.records.cancel')], cancelButtonIndex: options.length },
        (index) => {
          const choice = options[index];
          if (choice) openForm(choice.category);
        }
      );
      return;
    }
    Alert.alert(t('patient.records.emptyStateCta'), undefined, [
      ...options.map((option) => ({ text: option.label, onPress: () => openForm(option.category) })),
      { text: t('patient.records.cancel'), style: 'cancel' as const },
    ]);
  };

  return (
    <Screen onRefresh={records.refetch} refreshing={records.refreshing} staleSince={records.staleSince}>
      <Stack.Screen options={{ headerRight: () => <IconButton name="add" variant="plain" onPress={promptAdd} accessibilityLabel={t('patient.records.emptyStateCta')} /> }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {(Object.keys(counts) as RecordCategory[]).map((category) => (
          <Card key={category} style={{ flex: 1 }} padded>
            <IconBadge name={CATEGORY_ICON[category].icon} tone={CATEGORY_ICON[category].tone} size={32} />
            <Text variant="title" style={{ marginTop: spacing.sm }}>
              {counts[category]}
            </Text>
            <Text variant="micro" color="muted" numberOfLines={1}>
              {category === 'condition'
                ? t('patient.records.conditions')
                : category === 'allergy'
                  ? t('patient.records.allergies')
                  : t('patient.records.vaccinations')}
            </Text>
          </Card>
        ))}
      </View>
      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('patient.records.filterAllRecords') },
          { value: 'condition', label: t('patient.records.filterCondition') },
          { value: 'allergy', label: t('patient.records.filterAllergy') },
          { value: 'vaccination', label: t('patient.records.filterVax') },
        ]}
      />
      {entries.length > 5 ? (
        <View style={{ marginTop: spacing.md }}>
          <TextField placeholder={t('patient.records.searchPh')} value={search} onChangeText={setSearch} returnKeyType="search" clearButtonMode="while-editing" />
        </View>
      ) : null}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {records.loading ? (
          <SkeletonList count={4} />
        ) : !records.data && records.error ? (
          <ErrorState message={t('patient.records.loadError')} onRetry={() => void records.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={t('patient.records.emptyStateTitle')}
            body={t('patient.records.emptyStateBody')}
            action={{ label: t('patient.records.emptyStateCta'), onPress: promptAdd }}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon="search" title={t('patient.records.noMatchTitle')} />
        ) : (
          visible.map((entry) => (
            <Card key={`${entry.category}-${entry.id}`} onPress={() => openForm(entry.category, entry.id)}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <IconBadge name={CATEGORY_ICON[entry.category].icon} tone={CATEGORY_ICON[entry.category].tone} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
                      {entry.title}
                    </Text>
                    <Pill label={entry.status} tone={entry.statusTone} />
                  </View>
                  {entry.subtitle ? (
                    <Text variant="caption" color="muted" numberOfLines={2}>
                      {entry.subtitle}
                    </Text>
                  ) : null}
                  {entry.meta ? (
                    <Text variant="micro" color="subtle">
                      {entry.meta}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
      <Text variant="micro" color="subtle" style={{ marginTop: spacing.xl }}>
        {t('patient.records.footerDisclaimer')}
      </Text>
    </Screen>
  );
}

