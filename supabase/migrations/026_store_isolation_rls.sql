-- ════════════════════════════════════════════════════════════════════
-- Per-butikk-isolasjon (RLS). Tidligere var policyene KUN tenant-isolasjon
-- (eller qual:true for KPI/svinn) — en butikk-scopet bruker ville sett ALT.
--
-- Rollemodell (les + opprett + rediger + slett):
--   super_admin   → alt (alle tenants)
--   chain_manager → alt på sin tenant
--   area_manager  → kun sine enheter (user_stores)
--   store_manager → kun sin enhet (user_stores)
--   store_employee→ kun sin enhet (user_stores)
--
-- Widget-/skjermsidene leser med service-role (createAdminClient) og bypasser
-- RLS — så innstramming her påvirker IKKE skjermrendering.
-- Helpers er SECURITY DEFINER for å unngå RLS-rekursjon.
-- ════════════════════════════════════════════════════════════════════

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.is_all_store_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_my_role() in ('super_admin','chain_manager')
$$;

create or replace function public.user_can_access_store(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.get_my_role() = 'super_admin' then true
    when public.get_my_role() = 'chain_manager' then exists (
      select 1 from public.stores s where s.id = p_store_id and s.tenant_id = public.get_my_tenant_id()
    )
    else exists (
      select 1 from public.user_stores us
      where us.user_id = auth.uid() and us.store_id = p_store_id
    )
  end
$$;

-- Treffer et oppslag en av brukerens butikker? (admins: alltid). target_all/chain
-- regnes IKKE som «butikkens eget» — det administreres av tenant/super.
create or replace function public.content_reaches_my_store(p_content_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.is_all_store_admin() then true
  else exists (
    select 1 from public.content_targets ct
    where ct.content_item_id = p_content_item_id
      and (
        ct.store_id in (select store_id from public.user_stores where user_id = auth.uid())
        or ct.tag_id in (
          select st.tag_id from public.store_tags st
          where st.store_id in (select store_id from public.user_stores where user_id = auth.uid())
        )
      )
  ) end
$$;

-- ── stores ──────────────────────────────────────────────────────────
drop policy if exists tenant_isolation on public.stores;
create policy stores_select on public.stores for select using ( public.user_can_access_store(id) );
-- Skrive (opprette/slette butikker): kun tenant/super. Oppdatere: også butikk-admin på egen butikk.
create policy stores_insert on public.stores for insert with check (
  public.is_all_store_admin() and (public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id())
);
create policy stores_update on public.stores for update using ( public.user_can_access_store(id) ) with check ( public.user_can_access_store(id) );
create policy stores_delete on public.stores for delete using (
  public.is_all_store_admin() and (public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id())
);

-- ── store_kpi_week (var qual:true authenticated → lekket alt) ────────
drop policy if exists kpi_select_authenticated on public.store_kpi_week;
create policy kpi_select on public.store_kpi_week for select using ( public.user_can_access_store(store_id) );

-- ── store_svinn_kommentert (var qual:true authenticated) ────────────
drop policy if exists svinn_kommentert_select_authenticated on public.store_svinn_kommentert;
create policy svinn_select on public.store_svinn_kommentert for select using ( public.user_can_access_store(store_id) );
-- Kommentering av svinn: butikk-admin på egen butikk + tenant/super.
drop policy if exists svinn_kommentert_write_authenticated on public.store_svinn_kommentert;
create policy svinn_write on public.store_svinn_kommentert for all
  using ( public.user_can_access_store(store_id) ) with check ( public.user_can_access_store(store_id) );

-- ── content_items ───────────────────────────────────────────────────
drop policy if exists tenant_isolation on public.content_items;
-- Lese: admins alt på tenant (super: alle tenants); butikk-bruker ser egne + det som treffer butikken.
create policy content_select on public.content_items for select using (
  public.get_my_role() = 'super_admin'
  or (tenant_id = public.get_my_tenant_id() and (
        public.is_all_store_admin()
        or created_by = auth.uid()
        or public.content_reaches_my_store(id)
     ))
);
-- Opprette: enhver forfatter i tenanten (butikk-restriksjon håndheves på content_targets).
create policy content_insert on public.content_items for insert with check (
  public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id()
);
-- Endre/slette: admins, eller den som lagde det (butikk-bruker kan kun røre egne).
create policy content_update on public.content_items for update using (
  public.get_my_role() = 'super_admin'
  or (tenant_id = public.get_my_tenant_id() and (public.is_all_store_admin() or created_by = auth.uid()))
) with check (
  public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id()
);
create policy content_delete on public.content_items for delete using (
  public.get_my_role() = 'super_admin'
  or (tenant_id = public.get_my_tenant_id() and (public.is_all_store_admin() or created_by = auth.uid()))
);

-- ── content_targets (KJERNEN: butikk-bruker kan KUN målrette egne butikker) ──
drop policy if exists tenant_isolation on public.content_targets;
create policy content_targets_select on public.content_targets for select using (
  content_item_id in (select id from public.content_items)  -- arver content_items RLS
);
-- Skrive mål: admins kan alt; butikk-bruker kun konkrete egne butikker
-- (ikke target_all, ikke chain, ikke andre butikker, ikke tagger på tvers).
create policy content_targets_write on public.content_targets for all
  using (
    public.is_all_store_admin()
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and public.user_can_access_store(store_id))
  )
  with check (
    public.is_all_store_admin()
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and public.user_can_access_store(store_id))
  );
