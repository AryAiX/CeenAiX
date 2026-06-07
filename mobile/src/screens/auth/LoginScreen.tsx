import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.ReactElement {
  const { t } = useTranslation();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-center px-6">
          <Text className="text-3xl font-bold text-brand-600">CeenAiX</Text>
          <Text className="mt-6 text-2xl font-bold text-slate-900">{t('mobile.auth.loginTitle')}</Text>
          <Text className="mt-1 text-sm text-slate-500">{t('mobile.auth.loginSubtitle')}</Text>

          <View className="mt-8">
            <Text className="mb-1.5 text-xs font-semibold text-slate-700">{t('mobile.auth.email')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-900"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-1.5 text-xs font-semibold text-slate-700">{t('mobile.auth.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-900"
            />
          </View>

          {error ? <Text className="mt-3 text-sm text-rose-600">{error}</Text> : null}

          <View className="mt-6">
            <Button label={t('mobile.auth.signIn')} onPress={handleSubmit} loading={submitting} />
          </View>

          <Pressable className="mt-4" onPress={() => navigation.navigate('Signup')} accessibilityRole="button">
            <Text className="text-center text-sm font-medium text-brand-600">{t('mobile.auth.toSignup')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
