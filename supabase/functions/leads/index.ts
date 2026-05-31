import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COUNTER_FLOOR = 25;
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'protonmail.com',
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const routeAction = (pathname: string): string | null => {
  if (pathname.includes('demo-request')) return 'demo-request';
  if (pathname.includes('launch-notify')) return 'launch-notify';
  if (pathname.endsWith('/count') || pathname.endsWith('count')) return 'count';
  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const action = routeAction(new URL(req.url).pathname);
  if (!action) {
    return json({ success: false, errors: { _global: 'Not found' } }, 404);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, errors: { _global: 'Server misconfigured' } }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'count') {
    if (req.method !== 'GET') {
      return json({ success: false, errors: { _global: 'Method not allowed' } }, 405);
    }

    const { data, error } = await admin.rpc('marketing_leads_public_count');
    if (error) {
      return json({ visible: false, count: 0 });
    }

    const count = typeof data === 'number' ? data : 0;
    return json({ visible: count >= COUNTER_FLOOR, count });
  }

  if (req.method !== 'POST') {
    return json({ success: false, errors: { _global: 'Method not allowed' } }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, errors: { _global: 'Invalid JSON body' } }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return json({ success: true });
  }

  if (action === 'launch-notify') {
    const name = String(body.name ?? body.full_name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const preferredLanguage = String(body.preferred_language ?? 'en').trim() || 'en';
    const persona = body.persona ? String(body.persona).trim() : null;
    const marketingOptIn = Boolean(body.marketing_opt_in);
    const consent = Boolean(body.consent);

    const errors: Record<string, string> = {};
    if (!name) errors.name = 'This field is required.';
    if (!email) errors.email = 'This field is required.';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email.';
    if (!consent) errors.consent = 'This field is required.';

    if (Object.keys(errors).length > 0) {
      return json({ success: false, errors }, 422);
    }

    const { error } = await admin.from('marketing_launch_signups').insert({
      full_name: name,
      email,
      preferred_language: preferredLanguage,
      persona,
      marketing_opt_in: marketingOptIn,
      source: 'landing',
    });

    if (error?.code === '23505') {
      return json({ success: true });
    }
    if (error) {
      return json({ success: false, errors: { _global: 'Could not save signup.' } }, 500);
    }

    return json({ success: true });
  }

  if (action === 'demo-request') {
    const fullName = String(body.full_name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const organizationName = String(body.organization_name ?? '').trim();
    const roleTitle = String(body.role ?? body.role_title ?? '').trim();
    const organizationType = String(body.organization_type ?? '').trim();
    const country = String(body.country ?? '').trim();
    const teamSize = String(body.team_size ?? '').trim();
    const interests = Array.isArray(body.interests)
      ? body.interests.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const preferredDemoTime = body.preferred_demo_time
      ? String(body.preferred_demo_time).trim()
      : null;
    const specificDate = body.specific_date ? String(body.specific_date).trim() : null;
    const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;
    const preferredLanguage = String(body.preferred_language ?? 'English').trim() || 'English';
    const consent = Boolean(body.consent);
    const marketingOptIn = Boolean(body.marketing_opt_in);
    const overrideFreeEmail = Boolean(body.override_free_email);

    const errors: Record<string, string> = {};
    if (!fullName) errors.full_name = 'This field is required.';
    if (!email) errors.email = 'This field is required.';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email.';
    if (!phone) errors.phone = 'This field is required.';
    if (!organizationName) errors.organization_name = 'This field is required.';
    if (!roleTitle) errors.role = 'This field is required.';
    if (!organizationType) errors.organization_type = 'This field is required.';
    if (!country) errors.country = 'This field is required.';
    if (!teamSize) errors.team_size = 'This field is required.';
    if (interests.length === 0) errors.interests = 'Please select at least one.';
    if (!consent) errors.consent = 'This field is required.';

    const domain = email.split('@')[1] ?? '';
    if (!overrideFreeEmail && FREE_EMAIL_DOMAINS.has(domain)) {
      errors.email = 'Please use your work email, or confirm below to continue with this address.';
    }

    if (Object.keys(errors).length > 0) {
      return json({ success: false, errors }, 422);
    }

    const { error } = await admin.from('marketing_demo_requests').insert({
      full_name: fullName,
      email,
      phone,
      organization_name: organizationName,
      role_title: roleTitle,
      organization_type: organizationType,
      country,
      team_size: teamSize,
      interests,
      preferred_demo_time: preferredDemoTime,
      specific_date: specificDate || null,
      notes,
      preferred_language: preferredLanguage,
      consent,
      marketing_opt_in: marketingOptIn,
      override_free_email: overrideFreeEmail,
      source: 'landing',
    });

    if (error) {
      return json({ success: false, errors: { _global: 'Could not save demo request.' } }, 500);
    }

    return json({ success: true });
  }

  return json({ success: false, errors: { _global: 'Not found' } }, 404);
});
