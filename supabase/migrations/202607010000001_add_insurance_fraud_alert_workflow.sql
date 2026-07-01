-- Add workflow columns to capture status progression, officer assignment,
-- and resolution detail. Currently every fraud alert action (status change,
-- assignment, false positive clearing) only exists in React local state and
-- resets on page refresh.
alter table public.insurance_fraud_alerts
  add column if not exists assigned_officer_name text,
  add column if not exists assigned_at timestamp with time zone,
  add column if not exists resolution_note text,
  add column if not exists false_positive_reason text,
  add column if not exists closed_at timestamp with time zone;

-- Investigation notes log. Each note is immutable once written — investigators
-- can add but not edit or delete, matching DHA audit trail requirements.
create table if not exists public.insurance_fraud_investigation_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  fraud_alert_id uuid not null references public.insurance_fraud_alerts(id),
  author_name text not null,
  is_ai boolean not null default false,
  note text not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now()
);

alter table public.insurance_fraud_investigation_notes enable row level security;

create policy insurance_fraud_notes_admin_manage
  on public.insurance_fraud_investigation_notes for all
  using (is_current_user_super_admin());

create policy insurance_fraud_notes_ops_read
  on public.insurance_fraud_investigation_notes for select
  using (is_current_user_super_admin() or is_current_user_ops_org(organization_id, 'insurance'));

create policy insurance_fraud_notes_ops_insert
  on public.insurance_fraud_investigation_notes for insert
  with check (is_current_user_super_admin() or is_current_user_ops_org(organization_id, 'insurance'));

-- Update fraud alert status. Accepts the expanded set of workflow statuses
-- the UI already uses: open, investigating, monitoring, confirmed, resolved,
-- false_positive. The function validates the value server-side so a rogue
-- client cannot write an arbitrary string.
create or replace function public.insurance_update_fraud_alert_status(
  p_alert_id uuid,
  p_status text,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if p_status not in ('open', 'investigating', 'monitoring', 'confirmed', 'resolved', 'false_positive') then
    raise exception 'Invalid fraud alert status: %', p_status;
  end if;

  select organization_id into v_org_id from insurance_fraud_alerts where id = p_alert_id;
  if v_org_id is null then
    raise exception 'Fraud alert not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to update this fraud alert';
  end if;

  update insurance_fraud_alerts
  set status = p_status,
      resolution_note = coalesce(p_resolution_note, resolution_note),
      closed_at = case when p_status in ('resolved', 'false_positive') then now() else closed_at end,
      updated_at = now()
  where id = p_alert_id;
end;
$$;

-- Mark as false positive. Requires a reason and optional notes, sets status
-- to false_positive, and records the reason for the AI model feedback loop.
create or replace function public.insurance_mark_fraud_false_positive(
  p_alert_id uuid,
  p_false_positive_reason text,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if trim(p_false_positive_reason) = '' then
    raise exception 'A false positive reason is required';
  end if;

  select organization_id into v_org_id from insurance_fraud_alerts where id = p_alert_id;
  if v_org_id is null then
    raise exception 'Fraud alert not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to clear this fraud alert';
  end if;

  update insurance_fraud_alerts
  set status = 'false_positive',
      false_positive_reason = p_false_positive_reason,
      resolution_note = p_resolution_note,
      closed_at = now(),
      updated_at = now()
  where id = p_alert_id;
end;
$$;

-- Assign a fraud alert to an investigation officer by name. The officer
-- name is stored as plain text since investigator users may not all have
-- organization_members rows (they may be managed externally).
create or replace function public.insurance_assign_fraud_alert(
  p_alert_id uuid,
  p_officer_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from insurance_fraud_alerts where id = p_alert_id;
  if v_org_id is null then
    raise exception 'Fraud alert not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to assign this fraud alert';
  end if;

  update insurance_fraud_alerts
  set assigned_officer_name = p_officer_name,
      assigned_at = now(),
      updated_at = now()
  where id = p_alert_id;
end;
$$;

-- Add an investigation note. Notes are append-only (no update/delete RPC)
-- to preserve the audit trail per DHA fraud investigation guidelines.
create or replace function public.insurance_add_fraud_investigation_note(
  p_alert_id uuid,
  p_note text,
  p_author_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_note_id uuid;
begin
  if trim(p_note) = '' then
    raise exception 'Note text cannot be empty';
  end if;

  select organization_id into v_org_id from insurance_fraud_alerts where id = p_alert_id;
  if v_org_id is null then
    raise exception 'Fraud alert not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to add notes to this fraud alert';
  end if;

  insert into insurance_fraud_investigation_notes (
    organization_id, fraud_alert_id, author_name, note, created_by
  ) values (
    v_org_id, p_alert_id, p_author_name, p_note, auth.uid()
  )
  returning id into v_note_id;

  -- Update the alert's updated_at so it surfaces in sorted lists
  update insurance_fraud_alerts set updated_at = now() where id = p_alert_id;

  return v_note_id;
end;
$$;

grant execute on function public.insurance_update_fraud_alert_status(uuid, text, text) to authenticated;
grant execute on function public.insurance_mark_fraud_false_positive(uuid, text, text) to authenticated;
grant execute on function public.insurance_assign_fraud_alert(uuid, text) to authenticated;
grant execute on function public.insurance_add_fraud_investigation_note(uuid, text, text) to authenticated;
