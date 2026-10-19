import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StepProgress } from '@/components/step-progress';
import { Button, Card, IconBadge, InlineMessage, Screen, Text, TextField, ToggleRow } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { normalizePhone } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

type Method = 'email' | 'phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function SignUpScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { signUp, requestPhoneOtp } = useAuth();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<Method>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const totalSteps = method === 'email' ? 3 : 2;
  const titles = [t('auth.register.step1'), t('auth.register.step2Details'), t('auth.register.step3')];

  const validateDetails = (): string | null => {
    if (fullName.trim().length < 2) return t('auth.register.errors.fullNameShort');
    if (method === 'email' && !EMAIL_PATTERN.test(email.trim())) return t('auth.register.errors.emailRequired');
    if (method === 'phone' && normalizePhone(phone).length < 8) return t('m.auth.otpPhoneHint');
    return null;
  };

  const validateCredentials = (): string | null => {
    if (password.length < 8) return t('auth.register.errors.passwordShort');
    if (password !== confirmPassword) return t('auth.register.errors.passwordMismatch');
    if (!termsAccepted) return t('auth.register.errors.termsRequired');
    return null;
  };

  const fail = (message: string) => {
    haptics.error();
    setError(message);
  };

  const onContinue = async () => {
    setError(null);
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      const issue = validateDetails();
      if (issue) return fail(issue);
      if (method === 'email') {
        setStep(2);
        return;
      }
      setBusy(true);
      const normalized = normalizePhone(phone);
      const { error: otpError } = await requestPhoneOtp(normalized, { fullName });
      setBusy(false);
      if (otpError) return fail(otpError.message);
      router.push({ pathname: '/otp', params: { phone: normalized, flow: 'signup', fullName: fullName.trim() } });
      return;
    }
    const issue = validateCredentials();
    if (issue) return fail(issue);
    setBusy(true);
    const result = await signUp({
      email: email.trim().toLowerCase(),
      password,
      fullName,
      phone: phone.trim() ? normalizePhone(phone) : '',
      termsAccepted,
    });
    setBusy(false);
    if (result.error) {
      return fail(
        result.error.message.toLowerCase().includes('already registered')
          ? t('auth.register.errors.emailAlreadyRegistered')
          : result.error.message || t('auth.register.errors.signupFailed')
      );
    }
    haptics.success();
    if (result.needsConfirmation) setCreatedEmail(email.trim().toLowerCase());
  };

  const resendConfirmation = async () => {
    if (!createdEmail) return;
    setBusy(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: createdEmail });
    setBusy(false);
    if (resendError) setError(resendError.message);
    else setNotice(t('auth.register.resendSuccess'));
  };

  if (createdEmail) {
    return (
      <Screen edgeTop contentStyle={{ paddingTop: spacing.xxxl * 2, gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <IconBadge name="mail-unread-outline" tone="success" size={72} />
          <Text variant="title" align="center">
            {t('m.auth.checkEmailTitle')}
          </Text>
          <Text variant="body" color="muted" align="center">
            {t('auth.register.successAccountCreated')}
          </Text>
        </View>
        {notice ? <InlineMessage tone="success" message={notice} /> : null}
        {error ? <InlineMessage tone="danger" message={error} /> : null}
        <Button label={t('auth.register.signInInstead')} size="lg" fullWidth onPress={() => router.replace('/sign-in')} />
        <Button
          label={busy ? t('auth.register.resending') : t('auth.register.resendButton')}
          variant="secondary"
          fullWidth
          loading={busy}
          onPress={() => void resendConfirmation()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      edgeTop
      keyboard
      contentStyle={{ paddingTop: spacing.xxxl * 2 }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {step > 0 ? (
            <Button label={t('auth.register.btnBack')} variant="secondary" onPress={() => setStep(step - 1)} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              fullWidth
              size="lg"
              loading={busy}
              label={
                step === 1 && method === 'phone'
                  ? t('auth.register.btnSendCode')
                  : step === 2
                    ? t('auth.register.btnCreateAccount')
                    : t('auth.register.btnContinue')
              }
              onPress={() => void onContinue()}
            />
          </View>
        </View>
      }
    >
      <StepProgress current={step + 1} total={totalSteps} title={titles[step]} />
      <View style={{ gap: spacing.lg }}>
        {step === 0 ? (
          <>
            {(['email', 'phone'] as const).map((option) => (
              <Card
                key={option}
                onPress={() => setMethod(option)}
                tone={method === option ? 'brand' : undefined}
                accessibilityLabel={option === 'email' ? t('auth.register.modeEmailTitle') : t('auth.register.modePhoneTitle')}
              >
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <IconBadge name={option === 'email' ? 'mail-outline' : 'phone-portrait-outline'} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">
                      {option === 'email' ? t('auth.register.modeEmailTitle') : t('auth.register.modePhoneTitle')}
                    </Text>
                    <Text variant="caption" color="muted">
                      {option === 'email' ? t('auth.register.modeEmailDesc') : t('auth.register.modePhoneDesc')}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : null}
        {step === 1 ? (
          <>
            <TextField
              label={t('auth.register.fullName')}
              placeholder={t('auth.register.fullNamePlaceholder')}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              textContentType="name"
              autoFocus
            />
            {method === 'email' ? (
              <>
                <TextField
                  label={t('auth.register.email')}
                  placeholder={t('auth.register.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <TextField
                  label={t('auth.register.mobileShortOptional')}
                  placeholder={t('auth.register.mobilePlaceholder')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </>
            ) : (
              <TextField
                label={t('auth.register.mobile')}
                placeholder={t('auth.register.mobilePlaceholder')}
                helper={t('auth.register.otpNextHint')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            )}
          </>
        ) : null}
        {step === 2 ? (
          <>
            <TextField
              label={t('auth.register.password')}
              placeholder={t('auth.register.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TextField
              label={t('auth.register.confirmPassword')}
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <ToggleRow label={t('auth.register.termsLabel')} value={termsAccepted} onChange={setTermsAccepted} />
          </>
        ) : null}
        {error ? <InlineMessage tone="danger" message={error} /> : null}
      </View>
    </Screen>
  );
}
