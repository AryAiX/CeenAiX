-- Add status and workflow tracking columns to insurance_network_providers.
-- Currently status is derived client-side from performance_flag + fraud_score,
-- which means Approve/Reject/Terminate actions have nowhere to persist.
alter table public.insurance_network_providers
  add column if not exists status text not null default 'active',
  add column if not exists flagged_at timestamp with time zone,
  add column if not exists flagged_reason text,
  add column if not exists terminated_at timestamp with time zone,
  add column if not exists termination_reason text;

-- Internal notes log for network providers. Append-only for audit trail.
create table if not exists public.insurance_provider_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  provider_id uuid not null references public.insurance_network_providers(id),
  author_name text not null,
  note text not null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now()
);

alter table public.insurance_provider_notes enable row level security;

create policy insurance_provider_notes_admin_manage
  on public.insurance_provider_notes for all
  using (is_current_user_super_admin());

create policy insurance_provider_notes_ops_read
  on public.insurance_provider_notes for select
  using (is_current_user_super_admin() or is_current_user_ops_org(organization_id, 'insurance'));

create policy insurance_provider_notes_ops_insert
  on public.insurance_provider_notes for insert
  with check (is_current_user_super_admin() or is_current_user_ops_org(organization_id, 'insurance'));

-- Update provider status. Validates status value server-side and
-- automatically syncs performance_flag for backward compatibility
-- with the existing client-side status derivation logic.
create or replace function public.insurance_update_provider_status(
  p_provider_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if p_status not in ('active', 'pending', 'under_review', 'flagged', 'suspended', 'terminated') then
    raise exception 'Invalid provider status: %', p_status;
  end if;

  select organization_id into v_org_id
  from insurance_network_providers where id = p_provider_id;

  if v_org_id is null then
    raise exception 'Provider not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to update this provider';
  end if;

  update insurance_network_providers
  set
    status            = p_status,
    performance_flag  = case
                          when p_status in ('under_review', 'flagged') then 'under_review'
                          when p_status = 'suspended'                  then 'suspended'
                          when p_status = 'active'                     then 'active'
                          else performance_flag
                        end,
    flagged_at        = case when p_status = 'flagged'     then now() else flagged_at        end,
    flagged_reason    = case when p_status = 'flagged'     then p_reason else flagged_reason end,
    terminated_at     = case when p_status = 'terminated'  then now() else terminated_at     end,
    termination_reason= case when p_status = 'terminated'  then p_reason else termination_reason end,
    updated_at        = now()
  where id = p_provider_id;
end;
$$;

-- Add an internal note. Append-only — no update or delete RPC exists.
create or replace function public.insurance_add_provider_note(
  p_provider_id uuid,
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
    raise exception 'Note cannot be empty';
  end if;

  select organization_id into v_org_id
  from insurance_network_providers where id = p_provider_id;

  if v_org_id is null then
    raise exception 'Provider not found';
  end if;
  if not (is_current_user_super_admin() or is_current_user_ops_org(v_org_id, 'insurance')) then
    raise exception 'Not authorized to add notes to this provider';
  end if;

  insert into insurance_provider_notes (
    organization_id, provider_id, author_name, note, created_by
  ) values (
    v_org_id, p_provider_id, p_author_name, p_note, auth.uid()
  )
  returning id into v_note_id;

  update insurance_network_providers
  set updated_at = now()
  where id = p_provider_id;

  return v_note_id;
end;
$$;

grant execute on function public.insurance_update_provider_status(uuid, text, text) to authenticated;
grant execute on function public.insurance_add_provider_note(uuid, text, text) to authenticated;
