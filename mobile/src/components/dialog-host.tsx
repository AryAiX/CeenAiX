import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { resolveDialog, subscribeDialog, type DialogRequest } from '@/lib/dialog';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

/** Web-only renderer for `alertDialog` / `showActionSheet` (mounted in the root layout). */
export function DialogHost(): React.ReactElement | null {
  const { colors } = useTheme();
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => subscribeDialog(setRequest), []);

  if (!request) return null;
  const cancel = request.buttons.find((button) => button.style === 'cancel') ?? null;
  const actions = request.buttons.filter((button) => button.style !== 'cancel');

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => resolveDialog(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => resolveDialog(cancel)} accessibilityLabel="Dismiss dialog">
        <Pressable
          testID={request.sheet ? 'action-sheet' : 'dialog'}
          accessibilityRole="alert"
          accessibilityLabel={request.title}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => undefined}
        >
          {request.title ? (
            <Text variant="heading" testID="dialog-title">
              {request.title}
            </Text>
          ) : null}
          {request.message ? (
            <Text variant="body" color="muted" testID="dialog-message">
              {request.message}
            </Text>
          ) : null}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {[...actions, ...(cancel ? [cancel] : [])].map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                testID={button.style === 'cancel' ? 'dialog-btn-cancel' : `dialog-btn-${index}`}
                accessibilityRole="button"
                accessibilityLabel={button.text}
                onPress={() => resolveDialog(button)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor:
                      button.style === 'cancel' ? colors.surfaceMuted : button.style === 'destructive' ? colors.tones.danger.bg : colors.tones.brand.bg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  variant="bodyStrong"
                  align="center"
                  style={{
                    color: button.style === 'destructive' ? colors.tones.danger.fg : button.style === 'cancel' ? colors.text : colors.primary,
                  }}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
