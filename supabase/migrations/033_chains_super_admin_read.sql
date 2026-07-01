-- Super_admin skal kunne lese ALLE kjeder på tvers av tenants (som for stores),
-- ellers blir chains-embedden i butikk-tavla null når super_admin ser en annen
-- tenants forhandlere → de vises feilaktig som «Uten kjede».
--
-- Kun SELECT, kun super_admin. chain_manager/andre forblir tenant-scopet via den
-- eksisterende tenant_isolation-policyen (permissive policies OR-es sammen).
-- Skjermene/widgetene er upåvirket (de bruker service-role og omgår RLS uansett).

drop policy if exists chains_super_admin_read on public.chains;
create policy chains_super_admin_read on public.chains
  for select
  using (public.get_my_role() = 'super_admin');
