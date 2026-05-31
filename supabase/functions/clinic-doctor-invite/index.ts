import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const resolveSiteUrl = (req: Request) => {
  const configured = Deno.env.get('SITE_URL')?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const origin = req.headers.get('origin')?.trim();
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  return 'https://app.ceenaix.com';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ success: false, error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const invitationId = String(body.invitation_id ?? '').trim();
  if (!invitationId) {
    return json({ success: false, error: 'invitation_id is required' }, 422);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: canManage, error: manageError } = await userClient.rpc('clinic_member_can_manage');
  if (manageError || canManage !== true) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.role !== 'super_admin') {
      return json({ success: false, error: 'Not authorized to send clinic doctor invitations' }, 403);
    }
  }

  const { data: invitation, error: invitationError } = await admin
    .from('clinic_doctor_invitations')
    .select('id, email, full_name, status, facility_id, payload, facilities(name, name_en)')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitationError || !invitation) {
    return json({ success: false, error: 'Invitation not found' }, 404);
  }

  if (invitation.status !== 'pending') {
    return json({ success: false, error: 'Invitation is no longer pending' }, 409);
  }

  const clinicMemberFacilityId =
    canManage === true
      ? ((await userClient.rpc('current_user_clinic_facility_id')).data as string | null)
      : null;

  if (canManage === true && clinicMemberFacilityId && invitation.facility_id !== clinicMemberFacilityId) {
    return json({ success: false, error: 'Invitation belongs to another clinic' }, 403);
  }

  const email = String(invitation.email).trim().toLowerCase();
  const fullName = String(invitation.full_name).trim() || 'Doctor';
  const facilityRecord = invitation.facilities as { name?: string; name_en?: string } | null;
  const clinicName = facilityRecord?.name_en ?? facilityRecord?.name ?? 'your clinic';
  const siteUrl = resolveSiteUrl(req);
  const redirectTo = `${siteUrl}/auth/onboarding?role=doctor&invitation=${invitationId}`;

  const existingUser = (
    await admin.from('user_profiles').select('user_id').ilike('email', email).maybeSingle()
  ).data;

  if (existingUser?.user_id) {
    await admin.rpc('clinic_mark_doctor_invitation_email_sent', {
      p_invitation_id: invitationId,
      p_error: 'Account already exists — link the doctor from the clinic portal instead.',
    });
    return json({
      success: false,
      error: 'This email already has a CeenAiX account. Use the clinic portal to link the doctor instead.',
      mode: 'existing_account',
    }, 409);
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: 'doctor',
      full_name: fullName,
      clinic_name: clinicName,
      clinic_invitation_id: invitationId,
      clinic_facility_id: invitation.facility_id,
    },
    redirectTo,
  });

  if (inviteError) {
    await admin.rpc('clinic_mark_doctor_invitation_email_sent', {
      p_invitation_id: invitationId,
      p_error: inviteError.message,
    });
    return json({ success: false, error: inviteError.message }, 500);
  }

  await admin.rpc('clinic_mark_doctor_invitation_email_sent', {
    p_invitation_id: invitationId,
    p_error: null,
  });

  return json({
    success: true,
    mode: 'invited',
    invitation_id: invitationId,
    email,
    redirect_to: redirectTo,
  });
});
