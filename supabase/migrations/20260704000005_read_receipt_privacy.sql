alter table public.user_profiles
  add column if not exists hide_read_receipts boolean not null default false;

create or replace function public.get_message_counterparty_read_receipt_prefs(p_user_ids uuid[])
returns table (
  user_id uuid,
  hide_read_receipts boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.hide_read_receipts
  from public.user_profiles up
  where up.user_id = any(p_user_ids)
    and exists (
      select 1 from public.conversations c
      where (c.created_by = auth.uid() or c.participant_ids ? (auth.uid())::text)
        and (c.created_by = up.user_id or c.participant_ids ? (up.user_id)::text)
    );
$$;

grant execute on function public.get_message_counterparty_read_receipt_prefs(uuid[]) to authenticated;

notify pgrst, 'reload schema';