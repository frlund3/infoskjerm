-- Organisasjons-logo (tenant-nivå), separat fra per-kjede logo (chains.logo_url).
-- Vises i admin-sidebar-header og tenant-velgeren. Additiv, if not exists.
alter table public.tenants
  add column if not exists logo_url text;

comment on column public.tenants.logo_url is
  'Organisasjonens (tenant) logo — vises i sidebar-header og tenant-velger. Separat fra per-kjede logo (chains.logo_url).';
