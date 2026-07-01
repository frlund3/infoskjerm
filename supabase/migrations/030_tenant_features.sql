-- Per-tenant funksjonskapabiliteter (feature flags).
--
-- Lar oss bygge funksjonalitet/maler som KUN vises for bestemte tenants uten å
-- hardkode tenant-navn i UI-koden. Slå på ved å sette nøkler i `features`, f.eks.
--   {"offerCards": true, "gln": true}
-- Alt som ikke er satt = av. Nye tenants er «lean» som standard (opt-in per tenant).
--
-- Kjente flagg (se src/lib/tenant/features.ts for kilden til sannhet):
--   offerCards — varekort-bygger (struktur), masseimport av tilbud og spar.no-oppslag (dagligvare)
--   gln        — GLN / EPD-lokasjonsnummer på enheter (dagligvare, EDI mot Tradesolution)

alter table public.tenants
  add column if not exists features jsonb not null default '{}'::jsonb;

-- Dagligvare-tenants (unit_label = 'Butikk', f.eks. Gange-Rolv) beholder de
-- matvare-spesifikke funksjonene. Bilforhandlere o.l. (unit_label = 'Forhandler')
-- får dem ikke.
update public.tenants
set features = features || '{"offerCards": true, "gln": true}'::jsonb
where unit_label = 'Butikk';
