-- Add flagging columns to insurance_members. Currently Flag for Review
-- only shows a toast with no database write — officer flags are lost
-- on every page refresh.
alter table public.insurance_members
  add column if not exists flagged_for_review boolean not null default false,
  add column if not exists flagged_reason text,
  add column if not exists flagged_at timestamp with time zone;

-- Wellness outreach audit log. Covers both single-member outreach
-- (member_id set, audience = 'single_member') and bulk campaigns
-- (member_id null, audience describes the targeting criteria used).
-- Status is 'logged' since actual message delivery (SMS/email/push)
-- is not yet wired to a provider — this records intent and content
-- for DHA Patient Rights Charter auditability while delivery is
-- built separately in Phase 4.
create table if not exists public.insurance_wellness_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  member_id uuid references public.insurance_members(id),
  audience text not null,
  plan_filter text[],
  recipient_count integer not null,
  channels text[] not null,
  subject_en text,
  subject_ar text,
  message_en text not null,
  message_ar text,
  status text not null default 'logged',
  sent_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now()
);

alter table public.insurance_wellness_campaigns enable row level security;

create policy insurance_wellness_campaigns_admin_manage
  on public.insurance_wellness_campaigns for all
  using (is_current_user_super_admin());

create policy insurance_wellness_campaigns_ops_read
  on public.insurance_wellness_campaigns for select
  using (is_current_user_super_admin() or is_current_user_ops_org(organization_id, 'insurance'));

-- Flag a member for care review.
create or replace function public.insurance_flag_member_for_review(
  p_member_id uuid,
  p_flag_reason text default null
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
  from insurance_members
  where id = p_member_id;

  if v_org_id is null then
    raise exception 'Member not found';
  end if;

  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to flag this member';
  end if;

  update insurance_members
  set flagged_for_review = true,
      flagged_reason     = p_flag_reason,
      flagged_at         = now()
  where id = p_member_id;
end;
$$;

-- Log a wellness outreach attempt. Covers both single-member outreach
-- (pass p_member_id) and bulk campaigns (p_member_id null).
-- Determines the officer's organization server-side.
create or replace function public.insurance_log_wellness_outreach(
  p_audience text,
  p_recipient_count integer,
  p_channels text[],
  p_message_en text,
  p_member_id uuid default null,
  p_plan_filter text[] default null,
  p_subject_en text default null,
  p_subject_ar text default null,
  p_message_ar text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_member_org_id uuid;
  v_new_id uuid;
begin
  select organization_id into v_org_id
  from organization_members
  where user_id = auth.uid() and ends_at is null
  limit 1;

  if v_org_id is null or not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to log outreach for this organization';
  end if;

  if p_member_id is not null then
    select organization_id into v_member_org_id
    from insurance_members
    where id = p_member_id;

    if v_member_org_id is distinct from v_org_id then
      raise exception 'Member does not belong to this organization';
    end if;
  end if;

  insert into insurance_wellness_campaigns (
    organization_id, member_id, audience, plan_filter,
    recipient_count, channels, subject_en, subject_ar,
    message_en, message_ar, sent_by
  ) values (
    v_org_id, p_member_id, p_audience, p_plan_filter,
    p_recipient_count, p_channels, p_subject_en, p_subject_ar,
    p_message_en, p_message_ar, auth.uid()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.insurance_flag_member_for_review(uuid, text) to authenticated;
grant execute on function public.insurance_log_wellness_outreach(text, integer, text[], text, uuid, text[], text, text, text) to authenticated;
