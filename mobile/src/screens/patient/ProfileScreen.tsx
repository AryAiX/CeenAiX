import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Screen } from '../../components/ui';
import { useAuth } from '../../context/auth-context';
import { setLanguage } from '../../i18n';
import { supabase } from '../../lib/supabase';

interface ProfileFormState {
  fullName: string;
  phone: string;
  city: string;
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View className="flex-row justify-between border-t border-slate-50 py-2.5">
      <Text className="text-xs font-medium text-slate-400">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoComplete?: 'name' | 'tel' | 'address-line1';
}): React.ReactElement {
  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900"
      />
    </View>
  );
}

const normalizeOptional = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const splitFullName = (fullName: string): { firstName: string | null; lastName: string | null } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const imageExtensionFor = (mimeType: string): string => {
  const extension = mimeType.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  return extension === 'jpeg' || !extension ? 'jpg' : extension;
};

export function ProfileScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { profile, user, patientProfile, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    fullName: '',
    phone: '',
    city: '',
  });

  useEffect(() => {
    setForm({
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
    });
  }, [profile?.city, profile?.full_name, profile?.phone]);

  const initials = (profile?.full_name ?? 'C')
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl = profile?.avatar_url ?? null;

  const resetForm = (): void => {
    setForm({
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const saveProfile = async (): Promise<void> => {
    if (!user?.id) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullName = form.fullName.trim() || profile?.full_name || 'CeenAiX patient';
    const parsedName = splitFullName(fullName);
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        first_name: parsedName.firstName,
        last_name: parsedName.lastName,
        phone: normalizeOptional(form.phone),
        city: normalizeOptional(form.city),
      })
      .eq('user_id', user.id);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    await refreshProfile();
    setIsEditing(false);
    setSuccessMessage('Profile updated.');
    setIsSaving(false);
  };

  const showCameraSettingsAlert = (): void => {
    Alert.alert(
      'Camera access is off',
      'To take a profile photo, enable camera access for CeenAiX in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]
    );
  };

  const takeProfilePhoto = async (): Promise<void> => {
    if (!user?.id || isUploadingPhoto) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showCameraSettingsAlert();
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        setIsUploadingPhoto(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        setIsUploadingPhoto(false);
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${user.id}/avatar_${Date.now()}.${imageExtensionFor(mimeType)}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        setErrorMessage(uploadError.message);
        setIsUploadingPhoto(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (profileError) {
        setErrorMessage(profileError.message);
        setIsUploadingPhoto(false);
        return;
      }

      await refreshProfile();
      setSuccessMessage('Profile photo updated.');
      setIsUploadingPhoto(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open the camera.';
      setErrorMessage(message);
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between pb-3 pt-2">
        <Text className="text-2xl font-bold text-slate-900">{t('mobile.tabs.profile')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Close profile editor' : 'Edit profile'}
          onPress={() => {
            if (isEditing) {
              resetForm();
            }
            setIsEditing((current) => !current);
          }}
          hitSlop={12}
          className="rounded-full border border-slate-200 bg-white px-4 py-2"
        >
          <Text className="text-sm font-semibold text-brand-600">{isEditing ? 'Done' : 'Edit Profile'}</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text className="mb-3 text-sm text-rose-600">{errorMessage}</Text> : null}
      {successMessage ? <Text className="mb-3 text-sm text-emerald-600">{successMessage}</Text> : null}

      <Card>
        <View className="items-center pb-2">
          <View className="relative">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-600">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-20 w-20" resizeMode="cover" />
              ) : (
                <Text className="text-lg font-bold text-white">{initials}</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={() => void takeProfilePhoto()}
              disabled={isUploadingPhoto}
              hitSlop={14}
              className={`absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 ${
                isUploadingPhoto ? 'opacity-50' : ''
              }`}
              style={{ elevation: 4, zIndex: 10 }}
            >
              <Ionicons name="camera" size={18} color="#ffffff" />
            </Pressable>
          </View>
          <Text className="mt-2 text-base font-bold text-slate-900">{profile?.full_name ?? 'CeenAiX patient'}</Text>
          <Text className="text-xs text-slate-400">{user?.email}</Text>
        </View>

        {isEditing ? (
          <View className="border-t border-slate-50 pt-1">
            <Field
              label="Full name"
              value={form.fullName}
              onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))}
              placeholder="Jane Doe"
              autoComplete="name"
            />
            <Field
              label="Phone (optional)"
              value={form.phone}
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="+971 50 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Field
              label="City (optional)"
              value={form.city}
              onChangeText={(value) => setForm((current) => ({ ...current, city: value }))}
              placeholder="Dubai"
              autoComplete="address-line1"
            />
            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Reset"
                  variant="secondary"
                  onPress={() => {
                    resetForm();
                  }}
                  disabled={isSaving}
                />
              </View>
              <View className="flex-1">
                <Button label="Save" onPress={() => void saveProfile()} loading={isSaving} />
              </View>
            </View>
          </View>
        ) : (
          <>
            <Row label="Role" value={profile?.role ?? '-'} />
            <Row label="Phone (optional)" value={profile?.phone ?? 'Not provided'} />
            <Row label="City" value={profile?.city ?? 'Not provided'} />
            {patientProfile?.blood_type ? <Row label="Blood type" value={patientProfile.blood_type} /> : null}
          </>
        )}
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
