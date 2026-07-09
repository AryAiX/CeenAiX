alter table public.admin_insurance_partners
  add column if not exists platform_revenue_aed integer;

-- Backfill: extract the real number already embedded in the display label.
update public.admin_insurance_partners
set platform_revenue_aed = nullif(
  regexp_replace(
    substring(platform_revenue_label from 'AED\s*([\d,]+)'),
    '[^0-9]', '', 'g'
  ), ''
)::integer
where platform_revenue_label ~ 'AED\s*[\d,]+'
  and platform_revenue_aed is null;