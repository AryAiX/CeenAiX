import { supabase } from '@/lib/supabase';
import { extensionFor, uploadToBucket, type LocalAsset } from '@/lib/uploads';
import { uploadVaultDocument } from './documents';

// Mirrors the inline writes in web `src/pages/patient/Profile.tsx`
// (same tables, columns, buckets and storage paths).

export interface PersonalInfoInput {
  fullName: string;
  emiratesId: string;
  dateOfBirth: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export async function savePersonalInfo(userId: string, input: PersonalInfoInput): Promise<void> {
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      full_name: input.fullName.trim(),
      emirates_id: input.emiratesId.trim(),
      date_of_birth: input.dateOfBirth || null,
    })
    .eq('user_id', userId);
  if (profileError) throw profileError;

  const { error: patientError } = await supabase.from('patient_profiles').upsert(
    {
      user_id: userId,
      blood_type: input.bloodType || null,
      emergency_contact_name: input.emergencyContactName.trim() || null,
      emergency_contact_phone: input.emergencyContactPhone.trim() || null,
    },
    { onConflict: 'user_id' }
  );
  if (patientError) throw patientError;
}

export async function uploadAvatar(userId: string, asset: LocalAsset): Promise<string> {
  const path = `${userId}/avatar_${Date.now()}.${extensionFor(asset.mimeType)}`;
  await uploadToBucket('avatars', path, asset, { upsert: true });
  const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId);
  if (error) throw error;
  return publicUrl;
}

export async function removeAvatar(userId: string, avatarUrl: string): Promise<void> {
  const path = avatarUrl.split('/avatars/')[1];
  if (path) await supabase.storage.from('avatars').remove([path]);
  const { error } = await supabase.from('user_profiles').update({ avatar_url: null }).eq('user_id', userId);
  if (error) throw error;
}

export interface InsuranceDetailsInput {
  policyNumber: string;
  memberId: string;
  validFrom: string;
  validUntil: string;
  cardPhotoUrl: string | null;
}

export async function saveInsuranceDetails(patientInsuranceId: string, input: InsuranceDetailsInput): Promise<void> {
  const { error } = await supabase
    .from('patient_insurance')
    .update({
      policy_number: input.policyNumber.trim() || null,
      member_id: input.memberId.trim() || null,
      card_photo_url: input.cardPhotoUrl,
      valid_from: input.validFrom || null,
      valid_until: input.validUntil || null,
    })
    .eq('id', patientInsuranceId);
  if (error) throw error;
}

export async function uploadInsuranceCardImage(userId: string, asset: LocalAsset): Promise<string> {
  const path = `${userId}/insurance_card_${Date.now()}.${extensionFor(asset.mimeType)}`;
  await uploadToBucket('documents', path, asset, { upsert: true });
  return supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
}

/**
 * The web page keeps Emirates ID photos in component state only; on mobile
 * the capture is persisted to the patient's document vault so it survives.
 */
export async function saveEmiratesIdSide(userId: string, side: 'front' | 'back', asset: LocalAsset, title: string): Promise<void> {
  await uploadVaultDocument({
    patientId: userId,
    asset: { ...asset, name: `emirates_${side}_${Date.now()}.${extensionFor(asset.mimeType)}` },
    title,
    description: '',
    category: 'other',
    allowCareTeamAccess: false,
  });
}
