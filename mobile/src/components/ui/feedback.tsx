import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, type Tone } from '@/theme/tokens';
import { Button } from './form';
import { Icon, IconBadge, Text, type IconName } from './primitives';

export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.md,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: rounded,
          backgroundColor: colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Card-shaped placeholders used while a list screen loads. */
export function SkeletonList({ count = 4, height = 84 }: { count?: number; height?: number }): React.ReactElement {
  return (
    <View testID="state-loading" style={{ gap: spacing.md }} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} rounded={radius.xl} />
      ))}
    </View>
  );
}

export function ErrorState({ message, onRetry, testID = 'state-error' }: { message: string; onRetry?: () => void; testID?: string }): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[
        styles.errorBox,
        {
          backgroundColor: colors.tones.danger.bg,
          borderColor: colors.tones.danger.border,
        },
      ]}
    >
      <Icon name="alert-circle" color={colors.tones.danger.fg} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyStrong" color="danger">
          {t('m.common.errorTitle')}
        </Text>
        <Text variant="caption" color="danger">
          {message}
        </Text>
        {onRetry ? (
          <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
            <Button size="sm" variant="secondary" label={t('m.common.retry')} onPress={onRetry} testID="btn-retry" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  body,
  action,
  testID = 'state-empty',
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconBadge name={icon} size={52} />
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="caption" color="muted" align="center">
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={action.label} onPress={action.onPress} testID={`${testID}-action`} />
        </View>
      ) : null}
    </View>
  );
}

/** Shown when a screen falls back to the last cached fetch after a network failure. */
export function StaleBanner({ since }: { since: string }): React.ReactElement {
  const { t } = useTranslation();
  return <InlineMessage testID="banner-offline" tone="warning" icon="cloud-offline-outline" message={t('m.common.offline', { time: formatDateTime(since) })} />;
}

export function InlineMessage({ tone, message, icon, testID }: { tone: Tone; message: string; icon?: IconName; testID?: string }): React.ReactElement {
  const { colors } = useTheme();
  const toneColors = colors.tones[tone];
  const fallbackIcon: IconName =
    tone === 'success' ? 'checkmark-circle' : tone === 'danger' ? 'alert-circle' : tone === 'warning' ? 'warning' : 'information-circle';
  return (
    <View
      testID={testID ?? `message-${tone}`}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[styles.inline, { backgroundColor: toneColors.bg, borderColor: toneColors.border }]}
    >
      <Icon name={icon ?? fallbackIcon} size={18} color={toneColors.fg} />
      <Text variant="caption" style={{ color: toneColors.fg, flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
