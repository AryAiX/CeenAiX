alter table public.organizations
  add column if not exists dha_license text,
  add column if not exists nabidh_connected boolean not null default false;

-- Backfill: preserve today's notes-based guess as an editable starting point.
-- This is a best-effort migration of existing free-text signal, not verified fact.
update public.organizations
set dha_license = substring(notes from 'DHA-[A-Z]-\d{4}-\d{3,}')
where notes ~ 'DHA-[A-Z]-\d{4}-\d{3,}'
  and dha_license is null;

update public.organizations
set nabidh_connected = true
where notes ilike '%nabidh connected%';