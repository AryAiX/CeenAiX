import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.17.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TelemedicineRole = 'patient' | 'doctor';

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  is_deleted: boolean;
}

const ACTIVE_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);
const JOIN_LEAD_MS = 10 * 60 * 1000;
const JOIN_END_GRACE_MS = 15 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const roomNameForAppointment = (appointmentId: string) => `ceenaix-telemedicine-${appointmentId}`;

const isJoinWindowOpen = (appointment: AppointmentRow) => {
  const scheduledAtMs = new Date(appointment.scheduled_at).getTime();
  if (!Number.isFinite(scheduledAtMs)) return false;

  const nowMs = Date.now();
  const startsAtMs = scheduledAtMs - JOIN_LEAD_MS;
  const endsAtMs = scheduledAtMs + appointment.duration_minutes * 60_000 + JOIN_END_GRACE_MS;
  return nowMs >= startsAtMs && nowMs <= endsAtMs;
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
  const livekitUrl = Deno.env.get('LIVEKIT_URL')?.trim();
  const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')?.trim();
  const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')?.trim();

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return json({ success: false, error: 'Telemedicine service is not configured.' }, 500);
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

  const appointmentId = String(body.appointment_id ?? body.appointmentId ?? '').trim();
  if (!appointmentId) {
    return json({ success: false, error: 'appointment_id is required' }, 422);
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

  const { data: appointment, error: appointmentError } = await admin
    .from('appointments')
    .select('id, patient_id, doctor_id, type, status, scheduled_at, duration_minutes, is_deleted')
    .eq('id', appointmentId)
    .maybeSingle<AppointmentRow>();

  if (appointmentError) {
    return json({ success: false, error: appointmentError.message }, 500);
  }

  if (!appointment || appointment.is_deleted) {
    return json({ success: false, error: 'Appointment not found.' }, 404);
  }

  const role: TelemedicineRole | null =
    appointment.patient_id === user.id ? 'patient' : appointment.doctor_id === user.id ? 'doctor' : null;

  if (!role) {
    return json({ success: false, error: 'You are not a participant in this appointment.' }, 403);
  }

  if (appointment.type !== 'virtual') {
    return json({ success: false, error: 'This appointment is not a telemedicine visit.' }, 409);
  }

  if (!ACTIVE_STATUSES.has(appointment.status)) {
    return json({ success: false, error: 'This appointment is not active for telemedicine.' }, 409);
  }

  if (!isJoinWindowOpen(appointment)) {
    return json({ success: false, error: 'The video room opens 10 minutes before the appointment.' }, 409);
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, email')
    .eq('user_id', user.id)
    .maybeSingle<{ full_name: string | null; email: string | null }>();

  const participantName = profile?.full_name?.trim() || profile?.email?.trim() || user.email || role;
  const roomName = roomNameForAppointment(appointment.id);
  const ttlSeconds = Number(Deno.env.get('LIVEKIT_TOKEN_TTL_SECONDS') ?? 60 * 60 * 2);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: `${role}:${user.id}`,
    name: participantName,
    ttl: ttlSeconds,
    metadata: JSON.stringify({
      role,
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
    }),
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return json({
    success: true,
    token: await token.toJwt(),
    serverUrl: livekitUrl,
    roomName,
    appointmentId: appointment.id,
    participantName,
    role,
    expiresAt,
  });
});
