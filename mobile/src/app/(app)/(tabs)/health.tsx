import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Divider, ListRow, Pill, Screen, ScreenTitle, Section, type IconName } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useBadges } from '@/providers/badge-provider';
import { spacing, type Tone } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

interface Destination {
  href: Href;
  title: string;
  hint: string;
  icon: IconName;
  tone: Tone;
  badge?: number;
}

// Phone replacement for the web sidebar: the clinical and account pages that
// do not earn a tab are grouped here as one tap-through hub.
export default function HealthHubScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadNotifications } = useBadges();

  const groups: Array<{ title: string; items: Destination[] }> = [
    {
      title: t('m.health.clinical'),
      items: [
        {
          href: '/records',
          title: t('nav.records'),
          hint: t('m.health.recordsHint'),
          icon: 'document-text-outline',
          tone: 'brand',
        },
        {
          href: '/lab-results',
          title: t('nav.labResults'),
          hint: t('m.health.labsHint'),
          icon: 'flask-outline',
          tone: 'info',
        },
        {
          href: '/prescriptions',
          title: t('nav.prescriptions'),
          hint: t('m.health.prescriptionsHint'),
          icon: 'medkit-outline',
          tone: 'success',
        },
        {
          href: '/imaging',
          title: t('nav.imagingScans'),
          hint: t('m.health.imagingHint'),
          icon: 'scan-outline',
          tone: 'ai',
        },
      ],
    },
    {
      title: t('m.health.files'),
      items: [
        {
          href: '/documents',
          title: t('nav.documents'),
          hint: t('m.health.documentsHint'),
          icon: 'folder-open-outline',
          tone: 'warning',
        },
        {
          href: '/insurance',
          title: t('nav.insurance'),
          hint: t('m.health.insuranceHint'),
          icon: 'shield-checkmark-outline',
          tone: 'brand',
        },
      ],
    },
    {
      title: t('m.health.account'),
      items: [
        {
          href: '/notifications',
          title: t('nav.notifications'),
          hint: t('m.health.notificationsHint'),
          icon: 'notifications-outline',
          tone: 'danger',
          badge: unreadNotifications,
        },
        {
          href: '/profile',
          title: t('nav.profile'),
          hint: profile?.full_name ?? t('m.health.profileHint'),
          icon: 'person-circle-outline',
          tone: 'neutral',
        },
        {
          href: '/settings',
          title: t('nav.settings'),
          hint: t('m.health.settingsHint'),
          icon: 'settings-outline',
          tone: 'neutral',
        },
      ],
    },
  ];

  return (
    <Screen testID="screen-health" edgeTop>
      <ScreenTitle title={t('nav.myHealth')} subtitle={t('m.health.subtitle')} />
      {groups.map((group) => (
        <Section key={group.title} title={group.title}>
          <Card padded={false}>
            {group.items.map((item, index) => (
              <View key={item.title}>
                {index > 0 ? <Divider /> : null}
                <View style={{ paddingHorizontal: spacing.lg }}>
                  <ListRow
                    testID={typeof item.href === 'string' ? `row-${item.href.slice(1)}` : undefined}
                    title={item.title}
                    subtitle={item.hint}
                    icon={item.icon}
                    iconTone={item.tone}
                    trailing={item.badge ? <Pill label={String(item.badge)} tone="danger" /> : undefined}
                    showChevron
                    onPress={() => router.push(item.href)}
                  />
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
