import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBadges } from '@/providers/badge-provider';
import { useTheme } from '@/theme/theme-provider';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// react-native-web cannot render the native tab bar (and drops testIDs on its
// fallback), so the browser build uses the JS bottom tabs with the same five destinations.
export default function WebTabsLayout(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { unreadMessages } = useBadges();

  const tab = (id: string, label: string, icon: IoniconName, activeIcon: IoniconName, badge?: number) => ({
    title: label,
    tabBarButtonTestID: `tab-${id}`,
    tabBarAccessibilityLabel: label,
    tabBarBadge: badge ? (badge > 99 ? '99+' : badge) : undefined,
    tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
      <Ionicons name={focused ? activeIcon : icon} color={typeof color === 'string' ? color : undefined} size={size} />
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarBadgeStyle: { backgroundColor: colors.tones.danger.fg },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab('home', t('m.tabs.home'), 'home-outline', 'home')} />
      <Tabs.Screen name="appointments" options={tab('appointments', t('m.tabs.visits'), 'calendar-outline', 'calendar')} />
      <Tabs.Screen name="assistant" options={tab('assistant', t('m.tabs.assistant'), 'sparkles-outline', 'sparkles')} />
      <Tabs.Screen name="messages" options={tab('messages', t('m.tabs.messages'), 'chatbubbles-outline', 'chatbubbles', unreadMessages)} />
      <Tabs.Screen name="health" options={tab('health', t('m.tabs.health'), 'heart-outline', 'heart')} />
    </Tabs>
  );
}
