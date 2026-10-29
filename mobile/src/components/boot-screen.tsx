import { Image } from 'expo-image';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { spacing } from '@/theme/tokens';

// Native keeps the OS splash screen up during boot; the browser has no splash, so web paints this instead.
export function BootScreen(): React.ReactElement | null {
  const isDark = useColorScheme() === 'dark';
  if (Platform.OS !== 'web') return null;
  return (
    <View
      testID="state-loading"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading CeenAiX"
      aria-busy
      style={[styles.root, { backgroundColor: isDark ? '#020617' : '#f0fdfa' }]}
    >
      <Image source={require('../../assets/splash-icon.png')} style={styles.icon} contentFit="contain" />
      <Skeleton width={120} height={6} rounded={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  icon: {
    width: 160,
    height: 160,
  },
});
