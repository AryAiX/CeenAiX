import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  type TextInputInstance,
  View,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing, typography } from '@/theme/tokens';
import { Icon, Text, type IconName } from './primitives';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
}: ButtonProps): React.ReactElement {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.tones.danger.bg, fg: colors.tones.danger.fg, border: colors.tones.danger.border },
    ai: { bg: colors.tones.ai.fg, fg: colors.surface, border: colors.tones.ai.fg },
  };
  const tone = palette[variant];
  const height = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={() => {
        haptics.impact();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          alignSelf: fullWidth ? 'stretch' : 'auto',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={tone.fg} /> : null}
          <Text variant={size === 'sm' ? 'captionStrong' : 'bodyStrong'} style={{ color: tone.fg }} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helper?: string;
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, helper, secureToggle, secureTextEntry, multiline, ...rest },
  ref
) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={{ gap: 6 }}>
      <Text variant="captionStrong" color="muted">
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.tones.danger.fg : focused ? colors.primary : colors.border,
            minHeight: multiline ? 104 : 50,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.textSubtle}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={[
            typography.body,
            styles.input,
            { color: colors.text, textAlignVertical: multiline ? 'top' : 'center', paddingTop: multiline ? spacing.md : 0 },
          ]}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('auth.login.showPassword') : t('auth.login.hidePassword')}
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            style={{ paddingHorizontal: spacing.md }}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" color="subtle">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptics.tap();
              onChange(option.value);
            }}
            style={[styles.segment, selected && { backgroundColor: colors.surface, ...styles.segmentShadow }]}
          >
            <Text variant="captionStrong" color={selected ? 'default' : 'muted'} numberOfLines={1}>
              {option.label}
              {option.count !== undefined ? ` · ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoiceChips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: ReadonlyArray<T>;
  onToggle: (value: T) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              haptics.tap();
              onToggle(option.value);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isSelected ? <Icon name="checkmark" size={14} color={colors.primary} /> : null}
            <Text variant="captionStrong" style={{ color: isSelected ? colors.primary : colors.text }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" color="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          haptics.tap();
          onChange(next);
        }}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
      />
    </View>
  );
}

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const fromIsoDate = (value: string): Date => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};

/** Native date picker bound to a `YYYY-MM-DD` string (empty string = unset). */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}): React.ReactElement {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const onPicked = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  };
  return (
    <View style={{ gap: 6 }}>
      <Text variant="captionStrong" color="muted">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border, minHeight: 50 }]}
      >
        <Text variant="body" color={value ? 'default' : 'subtle'} style={{ flex: 1, paddingHorizontal: spacing.md }}>
          {value ? formatDate(fromIsoDate(value)) : t('m.common.selectDate')}
        </Text>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('m.common.clear')} onPress={() => onChange('')} hitSlop={10} style={{ paddingHorizontal: spacing.md }}>
            <Icon name="close-circle" size={18} />
          </Pressable>
        ) : (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Icon name="calendar-outline" size={18} />
          </View>
        )}
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ? fromIsoDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={colors.primary}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={onPicked}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: { flex: 1, paddingHorizontal: spacing.md, minHeight: 48 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: radius.md, gap: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.sm + 2 },
  segmentShadow: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
