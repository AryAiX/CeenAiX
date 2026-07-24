-- 1. Add invitation_status to lab_staff, mirroring facility_staff's pattern.
-- Default 'accepted' so the 4 existing active rows backfill correctly as
-- already-accepted members — no change to current behavior.
alter table public.lab_staff
  add column invitation_status text not null default 'accepted';

-- 2. A user requests to join an existing, active lab as staff.
-- Mirrors request_join_clinic exactly.
create or replace function public.request_join_lab(p_lab_id uuid, p_role_label text default 'staff')
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_existing public.lab_staff%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.lab_profiles p
    where p.id = p_lab_id
      and p.is_active = true
  ) then
    raise exception 'Laboratory not found or not accepting requests.' using errcode = 'P0002';
  end if;

  select * into v_existing
  from public.lab_staff
  where lab_id = p_lab_id
    and user_id = v_user_id
  for update;

  if not found then
    insert into public.lab_staff (lab_id, user_id, role_label, invitation_status, is_active)
    values (p_lab_id, v_user_id, p_role_label, 'pending', false);
  elsif v_existing.invitation_status in ('rejected', 'removed', 'cancelled') then
    update public.lab_staff
    set invitation_status = 'pending',
        is_active = false,
        updated_at = now()
    where id = v_existing.id;
  elsif v_existing.invitation_status = 'pending' then
    raise exception 'You already have a pending request with this laboratory.' using errcode = '23505';
  else
    raise exception 'You are already a member of this laboratory.' using errcode = '23505';
  end if;
end;
$function$;

-- 3. An existing active staff member (or super admin) approves a pending request.
create or replace function public.approve_lab_staff_join_request(p_staff_id uuid, p_lab_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff public.lab_staff%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  select * into v_staff
  from public.lab_staff
  where id = p_staff_id
    and lab_id = p_lab_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Laboratory staff request not found.' using errcode = 'P0002';
  end if;

  if v_staff.invitation_status <> 'pending' then
    raise exception 'This request is no longer pending.' using errcode = 'P0002';
  end if;

  if not (
    public.is_current_user_super_admin()
    or exists (
      select 1 from public.lab_staff s
      where s.lab_id = p_lab_id
        and s.user_id = auth.uid()
        and s.is_active = true
    )
  ) then
    raise exception 'Not authorized to approve this laboratory staff request.' using errcode = '42501';
  end if;

  update public.lab_staff
  set is_active = true,
      invitation_status = 'accepted',
      updated_at = now()
  where id = p_staff_id;
end;
$function$;

-- 4. Same authorization, for declining a pending request.
create or replace function public.reject_lab_staff_join_request(p_staff_id uuid, p_lab_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff public.lab_staff%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  select * into v_staff
  from public.lab_staff
  where id = p_staff_id
    and lab_id = p_lab_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Laboratory staff request not found.' using errcode = 'P0002';
  end if;

  if v_staff.invitation_status <> 'pending' then
    raise exception 'This request is no longer pending.' using errcode = 'P0002';
  end if;

  if not (
    public.is_current_user_super_admin()
    or exists (
      select 1 from public.lab_staff s
      where s.lab_id = p_lab_id
        and s.user_id = auth.uid()
        and s.is_active = true
    )
  ) then
    raise exception 'Not authorized to reject this laboratory staff request.' using errcode = '42501';
  end if;

  update public.lab_staff
  set invitation_status = 'rejected',
      is_active = false,
      updated_at = now()
  where id = p_staff_id;
end;
$function$;

-- 5. Self-registration: create a new lab and make the caller its first
-- active staff member, atomically. Blocks anyone already an active member
-- of another lab, to avoid recreating the multi-membership lockout state.
create or replace function public.self_register_lab(
  p_name text,
  p_slug text,
  p_city text default null,
  p_address text default null,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_lab_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.lab_staff
    where user_id = v_user_id
      and is_active = true
  ) then
    raise exception 'You are already an active member of a laboratory.' using errcode = '23505';
  end if;

  insert into public.lab_profiles (id, slug, name, city, address, phone, email, is_active, created_at, updated_at)
  values (gen_random_uuid(), p_slug, p_name, p_city, p_address, p_phone, p_email, true, now(), now())
  returning id into v_lab_id;

  insert into public.lab_staff (lab_id, user_id, role_label, invitation_status, is_active, created_at, updated_at)
  values (v_lab_id, v_user_id, 'owner', 'accepted', true, now(), now());

  return v_lab_id;
end;
$function$;

-- 6. Let authenticated users actually call these (SECURITY DEFINER functions
-- still need an explicit execute grant).
grant execute on function public.request_join_lab(uuid, text) to authenticated;
grant execute on function public.approve_lab_staff_join_request(uuid, uuid, uuid) to authenticated;
grant execute on function public.reject_lab_staff_join_request(uuid, uuid, uuid) to authenticated;
grant execute on function public.self_register_lab(text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';