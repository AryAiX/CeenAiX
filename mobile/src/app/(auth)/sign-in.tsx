import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, InlineMessage, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { hasSupabaseConfig } from '@/lib/env';
import { haptics } from '@/lib/haptics';
import { normalizePhone } from '@/lib/phone';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

type Mode = 'password' | 'otp';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function SignInScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithPassword, requestPhoneOtp } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submitPassword = async () => {
    setError(null);
    if (!email.trim() || !password) return;
    setBusy(true);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (signInError) {
      haptics.error();
      setError(signInError.message);
    } else {
      haptics.success();
    }
  };

  const submitOtp = async () => {
    setError(null);
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      setError(t('m.auth.otpPhoneHint'));
      return;
    }
    setBusy(true);
    const { error: otpError } = await requestPhoneOtp(normalized, null);
    setBusy(false);
    if (otpError) {
      haptics.error();
      setError(otpError.message);
      return;
    }
    router.push({
      pathname: '/otp',
      params: { phone: normalized, flow: 'signin' },
    });
  };

  return (
    <Screen testID="screen-sign-in" edgeTop keyboard contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('auth.login.title')} subtitle={t('m.auth.tagline')} />
      {!hasSupabaseConfig ? <InlineMessage tone="danger" message={t('m.common.missingConfig')} /> : null}
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        <SegmentedControl
          testID="segment-login-mode"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          options={[
            { value: 'password', label: t('auth.login.modePassword') },
            { value: 'otp', label: t('auth.login.modeOtp') },
          ]}
        />
        {mode === 'password' ? (
          <>
            <TextField
              testID="input-login-email"
              label={t('auth.login.email')}
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              testID="input-login-password"
              ref={passwordRef}
              label={t('auth.login.password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submitPassword()}
            />
            <Link href="/forgot-password" asChild>
              <Pressable testID="link-forgot-password" accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'flex-end' }}>
                <Text variant="captionStrong" color="primary">
                  {t('auth.login.forgotPassword')}
                </Text>
              </Pressable>
            </Link>
            {error ? <InlineMessage tone="danger" message={error} /> : null}
            <Button
              testID="btn-sign-in"
              label={busy ? t('auth.login.signingIn') : t('auth.login.signIn')}
              size="lg"
              fullWidth
              loading={busy}
              disabled={!email.trim() || !password}
              onPress={() => void submitPassword()}
            />
          </>
        ) : (
          <>
            <TextField
              testID="input-login-phone"
              label={t('auth.login.mobile')}
              placeholder={t('auth.register.mobilePlaceholder')}
              helper={t('auth.login.otpHint')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="send"
              onSubmitEditing={() => void submitOtp()}
            />
            {error ? <InlineMessage tone="danger" message={error} /> : null}
            <Button
              testID="btn-send-code"
              label={busy ? t('auth.login.sendingCode') : t('auth.login.sendCode')}
              size="lg"
              fullWidth
              loading={busy}
              disabled={!phone.trim()}
              onPress={() => void submitOtp()}
            />
          </>
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
          marginTop: spacing.xxl,
        }}
      >
        <Text variant="caption" color="muted">
          {t('auth.login.needAccount')}
        </Text>
        <Link href="/sign-up" asChild>
          <Pressable testID="link-sign-up" accessibilityRole="link" hitSlop={8}>
            <Text variant="captionStrong" color="primary">
              {t('auth.login.createAccount')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
