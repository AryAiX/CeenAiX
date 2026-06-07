import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Screen } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import { setLanguage } from '../../i18n';

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View className="flex-row justify-between border-t border-slate-50 py-2.5">
      <Text className="text-xs font-medium text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

export function ProfileScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { profile, user, patientProfile, signOut } = useAuth();

  const initials = (profile?.full_name ?? 'C')
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen>
      <Text className="pb-3 pt-2 text-2xl font-bold text-slate-900">{t('mobile.tabs.profile')}</Text>

      <Card>
        <View className="items-center pb-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-600">
            <Text className="text-lg font-bold text-white">{initials}</Text>
          </View>
          <Text className="mt-2 text-base font-bold text-slate-900">{profile?.full_name ?? 'CeenAiX patient'}</Text>
          <Text className="text-xs text-slate-400">{user?.email}</Text>
        </View>
        <Row label="Role" value={profile?.role ?? '—'} />
        {profile?.phone ? <Row label="Phone" value={profile.phone} /> : null}
        {profile?.city ? <Row label="City" value={profile.city} /> : null}
        {patientProfile?.blood_type ? <Row label="Blood type" value={patientProfile.blood_type} /> : null}
      </Card>

      <Text className="mb-2 mt-5 text-sm font-semibold text-slate-900">Language</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label="English"
            variant={i18n.language.startsWith('ar') ? 'secondary' : 'primary'}
            onPress={() => void setLanguage('en')}
          />
        </View>
        <View className="flex-1">
          <Button
            label="العربية"
            variant={i18n.language.startsWith('ar') ? 'primary' : 'secondary'}
            onPress={() => void setLanguage('ar')}
          />
        </View>
      </View>

      <View className="mt-8">
        <Button label={t('mobile.auth.signOut')} variant="secondary" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
