create policy patients_read_linked_staff_profiles
on public.user_profiles
for select
to authenticated
using (
  role in ('clinic', 'pharmacy', 'lab')
  and exists (
    select 1 from public.conversations
    where (
      conversations.created_by = auth.uid()
      or conversations.participant_ids ? (auth.uid())::text
    )
    and (
      conversations.created_by = user_profiles.user_id
      or conversations.participant_ids ? (user_profiles.user_id)::text
    )
  )
);