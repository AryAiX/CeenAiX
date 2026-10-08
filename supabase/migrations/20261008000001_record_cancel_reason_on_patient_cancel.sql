-- QA-026: record the cancel_patient_appointment version that is already live on dev.
-- It was changed on dev by hand and no migration recorded it. This file makes
-- the repo (and production) match dev. On dev itself it changes nothing.
-- Safe to run more than once.

alter table public.appointments add column if not exists cancellation_reason text;
alter table public.appointments add column if not exists cancelled_by_user_id uuid;
alter table public.appointments add column if not exists cancelled_at timestamptz;

-- Remove the old one-input version, so the two-input version below
-- replaces it instead of existing alongside it.
drop function if exists public.cancel_patient_appointment(uuid);

create or replace function public.cancel_patient_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_scheduled_at timestamptz;
  v_patient_name text;
begin
  update public.appointments
  set status = 'cancelled',
      updated_at = now(),
      cancellation_reason = p_reason,
      cancelled_by_user_id = auth.uid(),
      cancelled_at = now()
  where id = p_appointment_id
    and patient_id = auth.uid()
    and is_deleted = false
    and status in ('scheduled', 'confirmed')
    and scheduled_at > now()
  returning doctor_id, scheduled_at into v_doctor_id, v_scheduled_at;

  if not found then
    raise exception 'Appointment could not be cancelled.';
  end if;

  select full_name into v_patient_name from public.user_profiles where user_id = auth.uid();

  insert into public.notifications (user_id, type, title, body, is_read, action_url, created_at, is_deleted)
  values (
    v_doctor_id,
    'appointment',
    '❌ Appointment cancelled',
    'Your appointment with ' || coalesce(v_patient_name, 'the patient')
      || ' on ' || to_char(v_scheduled_at, 'FMDay, FMMonth FMDD, YYYY "at" FMHH12:MI AM')
      || ' has been cancelled by the patient.'
      || case when p_reason is not null and p_reason <> '' then ' Reason: ' || p_reason else '' end,
    false,
    '/doctor/appointments',
    now(),
    false
  );
end;
$$;

grant execute on function public.cancel_patient_appointment(uuid, text) to authenticated;