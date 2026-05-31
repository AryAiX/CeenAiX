import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const inviteUrl = () => `${SUPABASE_URL}/functions/v1/clinic-doctor-invite`;

export interface ClinicDoctorInviteResult {
  success: boolean;
  mode?: string;
  error?: string;
  invitation_id?: string;
  email?: string;
}

export async function sendClinicDoctorInvitation(invitationId: string): Promise<ClinicDoctorInviteResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    return { success: false, error: 'You must be signed in to send invitations.' };
  }

  const response = await fetch(inviteUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invitation_id: invitationId }),
  });

  const payload = (await response.json()) as ClinicDoctorInviteResult;
  if (!response.ok) {
    return {
      success: false,
      error: payload.error ?? 'Unable to send doctor invitation email.',
      mode: payload.mode,
    };
  }

  return payload;
}
