import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppLock } from '@/providers/app-lock-provider';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';
import { Button, IconBadge, Text } from './ui';

/** Full-screen cover shown over all routes while the biometric lock is engaged. */
export function LockScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { unlock, biometryLabel } = useAppLock();
  const { signOut } = useAuth();

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.background }]} accessibilityViewIsModal>
      <IconBadge name="lock-closed" size={72} />
      <Text variant="title" align="center">
        {t('m.lock.title')}
      </Text>
      <Text variant="body" color="muted" align="center">
        {t('m.lock.body', { method: biometryLabel })}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button label={t('m.lock.unlock')} icon="finger-print" size="lg" fullWidth onPress={() => void unlock()} />
        <Button label={t('m.auth.signOut')} variant="ghost" fullWidth onPress={() => void signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
});
