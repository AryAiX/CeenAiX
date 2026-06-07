import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props): React.ReactElement {
  const { t } = useTranslation();
  const { signUpWithPassword } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    setInfo(null);
    if (!terms) {
      setError(t('mobile.auth.terms'));
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUpWithPassword({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      termsAccepted: terms,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setInfo('Check your email to confirm your account, then sign in.');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-center px-6">
          <Text className="text-3xl font-bold text-brand-600">CeenAiX</Text>
          <Text className="mt-6 text-2xl font-bold text-slate-900">{t('mobile.auth.signupTitle')}</Text>
          <Text className="mt-1 text-sm text-slate-500">{t('mobile.auth.signupSubtitle')}</Text>

          <View className="mt-8">
            <Text className="mb-1.5 text-xs font-semibold text-slate-700">{t('mobile.auth.fullName')}</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Doe"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-900"
            />
          </View>

          <View className="mt-4">
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
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 px-3 py-3 text-base text-slate-900"
            />
          </View>

          <Pressable
            className="mt-4 flex-row items-center"
            onPress={() => setTerms((prev) => !prev)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: terms }}
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded border ${
                terms ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'
              }`}
            >
              {terms ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="ml-2 flex-1 text-xs text-slate-600">{t('mobile.auth.terms')}</Text>
          </Pressable>

          {error ? <Text className="mt-3 text-sm text-rose-600">{error}</Text> : null}
          {info ? <Text className="mt-3 text-sm text-emerald-600">{info}</Text> : null}

          <View className="mt-6">
            <Button label={t('mobile.auth.signUp')} onPress={handleSubmit} loading={submitting} />
          </View>

          <Pressable className="mt-4" onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text className="text-center text-sm font-medium text-brand-600">{t('mobile.auth.toLogin')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
