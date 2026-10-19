import type { ErrorBoundaryProps } from 'expo-router';
import { use, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import { ErrorState, StaleBanner } from './feedback';
import { Text } from './primitives';

interface ScreenProps {
  children: ReactNode;
  /** Pull-to-refresh handler; enables RefreshControl when provided. */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /** Shows the offline banner when data comes from the last-fetch cache. */
  staleSince?: string | null;
  /** Adds top safe-area padding (tab screens without a native header). */
  edgeTop?: boolean;
  /** Wraps in KeyboardAvoidingView for forms. */
  keyboard?: boolean;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  staleSince,
  edgeTop = false,
  keyboard = false,
  footer,
  contentStyle,
  scroll = true,
}: ScreenProps): React.ReactElement {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Undefined outside a stack navigator (e.g. tab roots).
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[
        styles.content,
        { paddingTop: (edgeTop ? insets.top : 0) + spacing.lg, paddingBottom: (footer ? spacing.lg : insets.bottom) + spacing.xxxl },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }
    >
      {staleSince ? (
        <View style={{ marginBottom: spacing.md }}>
          <StaleBanner since={staleSince} />
        </View>
      ) : null}
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: edgeTop ? insets.top : 0 }, contentStyle]}>{children}</View>
  );

  const inner = (
    <>
      {body}
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}

export function StickyFooter({ children }: { children: ReactNode }): React.ReactElement {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      {children}
    </View>
  );
}

export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }): React.ReactElement {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="display" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** expo-router route-level error boundary; route files re-export this as `ErrorBoundary`. */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' }}>
      <ErrorState message={error.message || t('m.common.unexpected')} onRetry={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
});
