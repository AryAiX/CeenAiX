import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandHeader } from '@/components/brand-header';
import { Button, InlineMessage, Screen, Skeleton, TextField } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';
import { spacing } from '@/theme/tokens';

// Target of the `ceenaix://reset-password?code=…` link sent by
// `resetPasswordForEmail`. The PKCE code is exchanged for a recovery session,
// then the patient picks a new password.
export default function ResetPasswordScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { code, error_description: linkError } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { session, completeRecovery, updatePassword, finishRecovery } = useAuth();
  const [exchanging, setExchanging] = useState(Boolean(code));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ?? null);
  const [done, setDone] = useState(false);
  const exchanged = useRef(false);

  useEffect(() => {
    if (!code || exchanged.current) return;
    exchanged.current = true;
    void completeRecovery(code).then(({ error: exchangeError }) => {
      setExchanging(false);
      if (exchangeError) setError(t('m.auth.recoveryLinkInvalid'));
    });
  }, [code, completeRecovery, t]);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError(t('auth.login.errors.passwordShort'));
    if (password !== confirm) return setError(t('auth.login.errors.passwordMismatch'));
    setBusy(true);
    const { error: updateError } = await updatePassword(password);
    setBusy(false);
    if (updateError) {
      haptics.error();
      setError(updateError.message);
      return;
    }
    haptics.success();
    setDone(true);
    setTimeout(() => {
      finishRecovery();
      router.replace('/');
    }, 900);
  };

  const canEdit = Boolean(session) && !exchanging;

  return (
    <Screen edgeTop keyboard contentStyle={{ paddingTop: spacing.xxxl * 2 }}>
      <BrandHeader title={t('auth.forgot.titleRecovery')} subtitle={t('auth.forgot.descriptionRecovery')} />
      {exchanging ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={50} />
          <Skeleton height={50} />
        </View>
      ) : null}
      {canEdit ? (
        <View style={{ gap: spacing.lg }}>
          <TextField
            label={t('auth.login.newPassword')}
            placeholder={t('auth.login.newPasswordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label={t('auth.login.confirmNewPassword')}
            placeholder={t('auth.login.repeatPasswordPlaceholder')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {done ? <InlineMessage tone="success" message={t('auth.login.passwordUpdatedRedirecting')} /> : null}
          {error ? <InlineMessage tone="danger" message={error} /> : null}
          <Button
            label={busy ? t('auth.login.updatingPassword') : t('auth.login.savePassword')}
            size="lg"
            fullWidth
            loading={busy}
            disabled={done}
            onPress={() => void submit()}
          />
        </View>
      ) : null}
      {!exchanging && !session ? (
        <View style={{ gap: spacing.lg }}>
          <InlineMessage tone="danger" message={error ?? t('m.auth.recoveryLinkInvalid')} />
          <Button label={t('auth.forgot.sendReset')} fullWidth onPress={() => router.replace('/forgot-password')} />
          <Button label={t('auth.forgot.returnSignIn')} variant="ghost" fullWidth onPress={() => router.replace('/sign-in')} />
        </View>
      ) : null}
    </Screen>
  );
}
