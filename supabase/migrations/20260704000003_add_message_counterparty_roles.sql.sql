create or replace function public.get_message_counterparty_roles(p_user_ids uuid[])
returns table (
  user_id uuid,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.role::text as role
  from public.user_profiles up
  where up.user_id = any(p_user_ids)
    and exists (
      select 1 from public.conversations c
      where (c.created_by = auth.uid() or c.participant_ids ? (auth.uid())::text)
        and (c.created_by = up.user_id or c.participant_ids ? (up.user_id)::text)
    );
$$;

grant execute on function public.get_message_counterparty_roles(uuid[]) to authenticated;

notify pgrst, 'reload schema';