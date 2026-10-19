import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { initialsOf } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, typography, type Tone, type TypographyVariant } from '@/theme/tokens';

export type IconName = keyof typeof Ionicons.glyphMap;

type TextColor = 'default' | 'muted' | 'subtle' | 'inverse' | 'primary' | Tone;

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'auto' | 'center';
}

export function Text({ variant = 'body', color = 'default', align = 'auto', style, ...rest }: TextProps): React.ReactElement {
  const { colors } = useTheme();
  const colorValue =
    color === 'default'
      ? colors.text
      : color === 'muted'
        ? colors.textMuted
        : color === 'subtle'
          ? colors.textSubtle
          : color === 'inverse'
            ? colors.textInverse
            : color === 'primary'
              ? colors.primary
              : colors.tones[color].fg;
  return (
    <RNText
      {...rest}
      style={[typography[variant] as TextStyle, { color: colorValue, textAlign: align, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }, style]}
    />
  );
}

export function Icon({ name, size = 20, color, flipRtl }: { name: IconName; size?: number; color?: string; flipRtl?: boolean }): React.ReactElement {
  const { colors } = useTheme();
  const icon = <Ionicons name={name} size={size} color={color ?? colors.textMuted} />;
  return flipRtl && I18nManager.isRTL ? <View style={styles.flip}>{icon}</View> : icon;
}

/** Forward chevron that points the right way in RTL. */
export function Chevron({ color }: { color?: string }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={I18nManager.isRTL ? styles.flip : undefined}>
      <Ionicons name="chevron-forward" size={18} color={color ?? colors.textSubtle} />
    </View>
  );
}

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: Tone;
  padded?: boolean;
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, tone, padded = true, accessibilityLabel }: CardProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone ? colors.tones[tone].bg : colors.surface,
    borderColor: tone ? colors.tones[tone].border : colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: padded ? spacing.lg : 0,
    ...(isDark ? {} : styles.shadow),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }): React.ReactElement {
  const { colors } = useTheme();
  const toneColors = colors.tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneColors.bg, borderColor: toneColors.border }]}>
      {icon ? <Ionicons name={icon} size={12} color={toneColors.fg} /> : null}
      <Text variant="micro" style={{ color: toneColors.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Required tag on every AI-generated message or summary (AGENTS.md). */
export function AiGeneratedTag(): React.ReactElement {
  const { t } = useTranslation();
  return <Pill tone="ai" icon="sparkles" label={t('m.ai.generatedTag')} />;
}

export function Avatar({ name, uri, size = 44 }: { name: string | null | undefined; uri?: string | null; size?: number }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.tones.brand.bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : (
        <Text variant={size > 50 ? 'title' : 'captionStrong'} style={{ color: colors.tones.brand.fg }}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  );
}

export function IconBadge({ name, tone = 'brand', size = 40 }: { name: IconName; tone?: Tone; size?: number }): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: colors.tones[tone].bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={colors.tones[tone].fg} />
    </View>
  );
}

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number;
  variant?: 'plain' | 'filled';
}

export function IconButton({ name, onPress, accessibilityLabel, badge, variant = 'filled' }: IconButtonProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        variant === 'filled' && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={name} size={22} color={colors.text} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.tones.danger.fg }]}>
          <RNText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</RNText>
        </View>
      ) : null}
    </Pressable>
  );
}

interface ListRowProps {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  iconTone?: Tone;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  leading,
  trailing,
  onPress,
  showChevron = Boolean(onPress),
  destructive,
}: ListRowProps): React.ReactElement {
  const content = (
    <View style={styles.row}>
      {leading ?? (icon ? <IconBadge name={icon} tone={destructive ? 'danger' : iconTone} size={36} /> : null)}
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'default'} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Chevron /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

export function Divider(): React.ReactElement {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs }} />;
}

export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  return (
    <View style={[{ marginTop: spacing.xxl }, style]}>
      {title ? (
        <View style={styles.sectionHeader}>
          <Text variant="heading">{title}</Text>
          {action ? (
            <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
              <Text variant="captionStrong" color="primary">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function KeyValue({ label, value }: { label: string; value: string | null | undefined }): React.ReactElement {
  return (
    <View style={styles.keyValue}>
      <Text variant="caption" color="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="captionStrong" style={{ flex: 1.4, textAlign: 'right' }}>
        {value?.trim() ? value : '—'}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: Tone }): React.ReactElement {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${clamped * 100}%`, backgroundColor: tone === 'brand' ? colors.primary : colors.tones[tone].fg },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flip: { transform: [{ scaleX: -1 }] },
  shadow: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBody: { flex: 1, gap: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  keyValue: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
});
