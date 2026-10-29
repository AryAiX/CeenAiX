import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { isArabic } from './strings';

interface StatusScreenProps {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  /** Covers the whole window, including the safe areas. */
  fullScreen?: boolean;
  testID?: string;
}

const TEAL_600 = '#0d9488';
const TEAL_700 = '#0f766e';
const SLATE_900 = '#0f172a';
const SLATE_500 = '#64748b';

export function StatusScreen({ title, body, actionLabel, onAction, fullScreen, testID }: StatusScreenProps): React.ReactElement {
  const align = isArabic ? 'right' : 'left';
  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, styles.root, fullScreen && styles.fullScreen]}>
      <View style={styles.card}>
        <Image source={require('../assets/brand-mark.png')} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text accessibilityRole="header" style={[styles.title, { textAlign: align }]}>
          {title}
        </Text>
        <Text style={[styles.body, { textAlign: align }]}>{body}</Text>
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.button, { backgroundColor: pressed ? TEAL_700 : TEAL_600 }]}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullScreen: { zIndex: 10 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    gap: 12,
  },
  logo: { width: 48, height: 48 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: SLATE_900 },
  body: { fontSize: 14, lineHeight: 20, color: SLATE_500 },
  button: { marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
