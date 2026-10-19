import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, InlineMessage, Screen, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function OtpScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { phone = '', flow = 'signin', fullName = '' } = useLocalSearchParams<{ phone?: string; flow?: string; fullName?: string }>();
  const { verifyPhoneOtp, requestPhoneOtp } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async (value: string) => {
    if (!phone) {
      setError(t('auth.otp.errors.noDestination'));
      return;
    }
    setError(null);
    setBusy(true);
    const { error: verifyError } = await verifyPhoneOtp(phone, value);
    setBusy(false);
    if (verifyError) {
      haptics.error();
      setError(verifyError.message);
      setCode('');
      return;
    }
    haptics.success();
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    const { error: resendError } = await requestPhoneOtp(phone, flow === 'signup' ? { fullName } : null);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setNotice(t('auth.otp.resentOk'));
    setCooldown(RESEND_SECONDS);
  };

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verify(digits);
  };

  return (
    <Screen edgeTop keyboard contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('auth.otp.title')} subtitle={t('m.auth.otpSentTo', { phone })} />
      <Pressable accessibilityLabel={t('auth.otp.codeLabel')} onPress={() => inputRef.current?.focus()} style={styles.cells}>
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const active = index === code.length;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.border },
              ]}
            >
              <Text variant="title">{code[index] ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={CODE_LENGTH}
        style={styles.hiddenInput}
        accessibilityLabel={t('auth.otp.codeLabel')}
      />
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Text variant="caption" color="muted" align="center">
          {flow === 'signup' ? t('auth.otp.signupFlow') : t('auth.otp.signinFlow')}
        </Text>
        {notice ? <InlineMessage tone="success" message={notice} /> : null}
        {error ? <InlineMessage tone="danger" message={error} /> : null}
        <Button
          label={busy ? t('auth.otp.verifying') : t('auth.otp.verify')}
          size="lg"
          fullWidth
          loading={busy}
          disabled={code.length !== CODE_LENGTH}
          onPress={() => void verify(code)}
        />
        <Button
          label={cooldown > 0 ? t('m.auth.resendIn', { seconds: cooldown }) : t('auth.otp.resend')}
          variant="ghost"
          fullWidth
          disabled={cooldown > 0}
          onPress={() => void resend()}
        />
        <Button label={t('auth.otp.goBack')} variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, direction: 'ltr' },
  cell: {
    width: 48,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
