import { Image } from 'expo-image';
import { View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { Text } from './ui';

export function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }): React.ReactElement {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl }}>
      <Image
        source={require('../../assets/brand-mark.png')}
        style={{ width: 72, height: 72 }}
        contentFit="contain"
        accessibilityLabel="CeenAiX"
      />
      <Text variant="title" align="center" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="muted" align="center">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
