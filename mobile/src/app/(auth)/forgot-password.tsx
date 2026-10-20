import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, InlineMessage, Screen, TextField } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/ui';

export default function ForgotPasswordScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const { error: resetError } = await requestPasswordReset(email.trim().toLowerCase());
    setBusy(false);
    if (resetError) {
      haptics.error();
      setError(resetError.message);
      return;
    }
    haptics.success();
    setSent(true);
  };

  return (
    <Screen testID="screen-forgot-password" edgeTop keyboard contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('auth.forgot.titleRequest')} subtitle={t('auth.forgot.descriptionRequest')} />
      <View style={{ gap: spacing.lg }}>
        <TextField
          testID="input-forgot-email"
          label={t('auth.login.email')}
          placeholder={t('auth.login.emailPlaceholder')}
          helper={t('auth.forgot.resetInfo')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
        />
        {sent ? <InlineMessage tone="success" message={t('auth.forgot.resetSent')} /> : null}
        {error ? <InlineMessage tone="danger" message={error} /> : null}
        <Button
          testID="btn-send-reset"
          label={busy ? t('auth.forgot.sending') : t('auth.forgot.sendReset')}
          size="lg"
          fullWidth
          loading={busy}
          disabled={!email.includes('@')}
          onPress={() => void submit()}
        />
        <Button testID="btn-return-sign-in" label={t('auth.forgot.returnSignIn')} variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
