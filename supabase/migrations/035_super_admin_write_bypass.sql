-- super_admin må kunne SKRIVE på tvers av tenants under «act-as» (superadmin-plattform).
-- Uten dette blokkerer tenant_isolation-policyen (tenant_id = get_my_tenant_id()) super_admins
-- skriving til en annen tenants chains/screens/users → «lagret» men 0 rader endret.
-- App-laget scoper hver skriving med .eq("tenant_id", <aktiv tenant>), så tenant-isolasjonen
-- holdes i appen. Dette speiler den eksisterende super_admin-bypassen på content_items.
-- Normale roller er upåvirket (tenant_isolation står urørt).

-- chains: erstatt read-only super_admin-policyen med en full (all) bypass.
drop policy if exists chains_super_admin_read on public.chains;
drop policy if exists chains_super_admin_all on public.chains;
create policy chains_super_admin_all on public.chains for all
  using (public.get_my_role() = 'super_admin'::user_role)
  with check (public.get_my_role() = 'super_admin'::user_role);

-- screens: super_admin full bypass (token-read-policyen står urørt).
drop policy if exists screens_super_admin_all on public.screens;
create policy screens_super_admin_all on public.screens for all
  using (public.get_my_role() = 'super_admin'::user_role)
  with check (public.get_my_role() = 'super_admin'::user_role);

-- users: super_admin full bypass (users hadde ingen super_admin-policy fra før).
drop policy if exists users_super_admin_all on public.users;
create policy users_super_admin_all on public.users for all
  using (public.get_my_role() = 'super_admin'::user_role)
  with check (public.get_my_role() = 'super_admin'::user_role);
