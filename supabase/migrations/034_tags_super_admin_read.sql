-- Samme som 033 (chains): super_admin skal kunne lese ALLE tagger og kobling
-- store_tags på tvers av tenants. Ellers blir tag-embedden i butikk-tavla og
-- tag-velgeren i innholdseditoren tom når super_admin ser en annen tenants
-- forhandlere (bilmerkene forsvinner selv om de er korrekt lagret).
--
-- Kun SELECT, kun super_admin. chain_manager/andre forblir tenant-scopet via de
-- eksisterende tenant_isolation-policyene. Skjermer/widgets bruker service-role.

drop policy if exists tags_super_admin_read on public.tags;
create policy tags_super_admin_read on public.tags
  for select
  using (public.get_my_role() = 'super_admin');

drop policy if exists store_tags_super_admin_read on public.store_tags;
create policy store_tags_super_admin_read on public.store_tags
  for select
  using (public.get_my_role() = 'super_admin');
