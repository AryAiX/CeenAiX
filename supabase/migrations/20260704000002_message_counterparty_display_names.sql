create or replace function public.get_message_counterparty_details(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    up.user_id,
    case
      when up.role = 'clinic' then coalesce(f.name, up.full_name)
      when up.role = 'pharmacy' then coalesce(o.name, up.full_name)
      when up.role = 'lab' then coalesce(lp.name, up.full_name)
      else up.full_name
    end as display_name,
    up.email
  from public.user_profiles up
  left join public.clinic_portal_members cpm on cpm.user_id = up.user_id
  left join public.facilities f on f.id = cpm.facility_id
  left join public.organization_members om on om.user_id = up.user_id and om.is_primary = true
  left join public.organizations o on o.id = om.organization_id
  left join public.lab_staff ls on ls.user_id = up.user_id
  left join public.lab_profiles lp on lp.id = ls.lab_id
  where up.user_id = any(p_user_ids)
    and exists (
      select 1 from public.conversations c
      where (c.created_by = auth.uid() or c.participant_ids ? (auth.uid())::text)
        and (c.created_by = up.user_id or c.participant_ids ? (up.user_id)::text)
    );
$$;

grant execute on function public.get_message_counterparty_details(uuid[]) to authenticated;

notify pgrst, 'reload schema';