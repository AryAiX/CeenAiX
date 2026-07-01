-- Add missing profile columns that Settings currently captures
-- but has nowhere to persist.
alter table public.insurance_payer_profiles
  add column if not exists ai_confidence_threshold_pct integer not null default 95,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

-- Update payer profile settings. Only updates fields that are
-- editable by an insurance officer — display_name and regulator_name
-- are controlled by admin and intentionally excluded.
create or replace function public.insurance_update_payer_profile(
  p_arabic_name text default null,
  p_officer_name text default null,
  p_officer_title text default null,
  p_sla_standard_hours integer default null,
  p_sla_urgent_hours integer default null,
  p_ai_confidence_threshold_pct integer default null,
  p_contact_email text default null,
  p_contact_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from organization_members
  where user_id = auth.uid() and ends_at is null
  limit 1;

  if v_org_id is null or not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to update payer profile settings';
  end if;

  if p_ai_confidence_threshold_pct is not null and (p_ai_confidence_threshold_pct < 50 or p_ai_confidence_threshold_pct > 100) then
    raise exception 'AI confidence threshold must be between 50 and 100';
  end if;

  if p_sla_standard_hours is not null and p_sla_standard_hours < 1 then
    raise exception 'Standard SLA must be at least 1 hour';
  end if;

  if p_sla_urgent_hours is not null and p_sla_urgent_hours < 1 then
    raise exception 'Urgent SLA must be at least 1 hour';
  end if;

  update public.insurance_payer_profiles
  set
    arabic_name                 = coalesce(p_arabic_name,                  arabic_name),
    officer_name                = coalesce(p_officer_name,                 officer_name),
    officer_title               = coalesce(p_officer_title,                officer_title),
    sla_target_standard_hours   = coalesce(p_sla_standard_hours,           sla_target_standard_hours),
    sla_target_urgent_hours     = coalesce(p_sla_urgent_hours,             sla_target_urgent_hours),
    ai_confidence_threshold_pct = coalesce(p_ai_confidence_threshold_pct,  ai_confidence_threshold_pct),
    contact_email               = coalesce(p_contact_email,                contact_email),
    contact_phone               = coalesce(p_contact_phone,                contact_phone),
    updated_at                  = now()
  where organization_id = v_org_id;
end;
$$;

grant execute on function public.insurance_update_payer_profile(text, text, text, integer, integer, integer, text, text) to authenticated;

