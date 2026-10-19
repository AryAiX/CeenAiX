import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/theme/tokens';
import { ProgressBar, Text } from './ui';

/** Progress header for one-step-per-screen wizards (sign-up, booking, pre-visit). */
export function StepProgress({ current, total, title }: { current: number; total: number; title?: string }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.xl }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current }}>
      <Text variant="micro" color="muted">
        {t('m.common.stepOf', { current, total }).toUpperCase()}
      </Text>
      <ProgressBar value={current / total} />
      {title ? (
        <Text variant="title" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}
