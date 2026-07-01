-- KPI-dashboard + drift-synk («Oppdater KPI nå») er kun for kjeder med
-- Drift-integrasjon. Slår på tenant-funksjonen `kpi` for Gange-Rolv AS, slik at
-- «Oppdater KPI nå»-knappen (og server-actionen) kun vises/kjører der — aldri
-- for andre tenants som Mobile AS. Gate i UI/action via hasFeature(..., "kpi").
--
-- Merk: repo-migrasjoner er frakoblet prod (Branching driver ikke prod), så denne
-- er også kjørt direkte mot prod-prosjektet. Idempotent (jsonb-merge).

update public.tenants
set features = coalesce(features, '{}'::jsonb) || '{"kpi": true}'::jsonb
where id = '00000000-0000-0000-0000-000000000001'; -- Gange-Rolv AS
