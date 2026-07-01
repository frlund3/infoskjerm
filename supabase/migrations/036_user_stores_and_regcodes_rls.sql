-- user_stores hadde RLS på men INGEN policies → deny-all for authenticated:
-- (1) bryter bruker-UI (chain_manager ser ikke butikk-tildelinger via RLS-klienten)
-- (2) setUserStores feiler stille. Legger til tenant-scopede policies.
--
-- screen_registration_codes: UPDATE-policyen var USING(true) (ingen grense).
-- Strammes til tenant/super_admin (service-role omgår RLS og påvirkes ikke).

-- ── user_stores ─────────────────────────────────────────────────────────────
drop policy if exists user_stores_select on public.user_stores;
create policy user_stores_select on public.user_stores
  for select
  using (
    public.get_my_role() = 'super_admin'
    or user_id = auth.uid()
    or (public.is_all_store_admin() and exists (
         select 1 from public.users u
         where u.id = user_stores.user_id and u.tenant_id = public.get_my_tenant_id()
       ))
  );

drop policy if exists user_stores_write on public.user_stores;
create policy user_stores_write on public.user_stores
  for all
  using (
    public.get_my_role() = 'super_admin'
    or (public.is_all_store_admin()
        and exists (select 1 from public.users u where u.id = user_stores.user_id and u.tenant_id = public.get_my_tenant_id())
        and exists (select 1 from public.stores s where s.id = user_stores.store_id and s.tenant_id = public.get_my_tenant_id()))
  )
  with check (
    public.get_my_role() = 'super_admin'
    or (public.is_all_store_admin()
        and exists (select 1 from public.users u where u.id = user_stores.user_id and u.tenant_id = public.get_my_tenant_id())
        and exists (select 1 from public.stores s where s.id = user_stores.store_id and s.tenant_id = public.get_my_tenant_id()))
  );

-- ── screen_registration_codes ───────────────────────────────────────────────
drop policy if exists service_can_update_codes on public.screen_registration_codes;
create policy reg_codes_update on public.screen_registration_codes
  for update
  using (public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id())
  with check (public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id());
