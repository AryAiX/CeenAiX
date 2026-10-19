import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

const badgeText = (count: number) => (count > 0 ? (count > 99 ? '99+' : String(count)) : undefined);

// Native UITabBar / Material bottom navigation. Five patient destinations;
// everything else is pushed on the parent stack.
export default function TabsLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { unreadMessages } = useBadges();

  return (
    <NativeTabs tintColor={colors.primary} backgroundColor={colors.tabBar} badgeBackgroundColor={colors.tones.danger.fg} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index" testID="tab-home">
        <NativeTabs.Trigger.Label>{t('m.tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="appointments" testID="tab-appointments">
        <NativeTabs.Trigger.Label>{t('m.tabs.visits')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistant" testID="tab-assistant">
        <NativeTabs.Trigger.Label>{t('m.tabs.assistant')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages" testID="tab-messages">
        <NativeTabs.Trigger.Label>{t('m.tabs.messages')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
          md="chat"
        />
        <NativeTabs.Trigger.Badge hidden={unreadMessages === 0}>{badgeText(unreadMessages)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="health" testID="tab-health">
        <NativeTabs.Trigger.Label>{t('m.tabs.health')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'heart.text.square',
            selected: 'heart.text.square.fill',
          }}
          md="favorite"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
