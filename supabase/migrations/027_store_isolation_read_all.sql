-- Presisering av per-butikk-isolasjon:
--  • LESE: butikk-scopede brukere skal også se «alle butikker»-innhold
--    (target_all) — det vises på skjermen deres.
--  • ENDRE/SLETTE: kun super_admin, chain_manager eller brukere tildelt ALLE
--    butikker kan røre «alle butikker»-/chain-innhold. En butikk-bruker kan kun
--    endre innhold der ALLE mål ligger innenfor egne butikker — så en bruker med
--    kun SPAR Tresfjord kan IKKE endre et oppslag som også gjelder EUROSPAR
--    Blindheim (det ville påvirket en butikk de ikke styrer).
--  • OPPRETTE mål: butikk-bruker kun konkrete egne butikker.

-- Bruker tildelt alle butikker i tenanten (eller super/chain)?
create or replace function public.user_has_all_stores()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_all_store_admin() or (
    exists (select 1 from public.user_stores us where us.user_id = auth.uid())
    and not exists (
      select 1 from public.stores s
      where s.tenant_id = public.get_my_tenant_id()
        and not exists (
          select 1 from public.user_stores us2
          where us2.user_id = auth.uid() and us2.store_id = s.id
        )
    )
  )
$$;

-- Lese-treff: inkluder target_all (chain-innhold som spilles på butikkens skjerm).
create or replace function public.content_reaches_my_store(p_content_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.is_all_store_admin() then true
  else exists (
    select 1 from public.content_targets ct
    where ct.content_item_id = p_content_item_id
      and (
        ct.target_all = true
        or ct.store_id in (select store_id from public.user_stores where user_id = auth.uid())
        or ct.tag_id in (
          select st.tag_id from public.store_tags st
          where st.store_id in (select store_id from public.user_stores where user_id = auth.uid())
        )
      )
  ) end
$$;

-- Ligger ALLE målene til et oppslag innenfor brukerens butikker?
-- (Ingen target_all, ingen chain, ingen butikk/tag utenfor tilgangen.) Admins: alltid.
create or replace function public.content_only_my_stores(p_content_item_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.user_has_all_stores() then true
  else not exists (
    select 1 from public.content_targets ct
    where ct.content_item_id = p_content_item_id
      and (
        ct.target_all = true
        or ct.chain_id is not null
        or (ct.store_id is not null and not public.user_can_access_store(ct.store_id))
        or (ct.tag_id is not null and exists (
              select 1 from public.store_tags st
              where st.tag_id = ct.tag_id
                and not public.user_can_access_store(st.store_id)
           ))
      )
  ) end
$$;

-- Endre/slette: all-tildelte (+ admins) kan alt; ellers kun innhold som ligger
-- 100 % innenfor egne butikker.
drop policy if exists content_update on public.content_items;
create policy content_update on public.content_items for update using (
  public.get_my_role() = 'super_admin'
  or (tenant_id = public.get_my_tenant_id() and (public.user_has_all_stores() or public.content_only_my_stores(id)))
) with check (
  public.get_my_role() = 'super_admin' or tenant_id = public.get_my_tenant_id()
);

drop policy if exists content_delete on public.content_items;
create policy content_delete on public.content_items for delete using (
  public.get_my_role() = 'super_admin'
  or (tenant_id = public.get_my_tenant_id() and (public.user_has_all_stores() or public.content_only_my_stores(id)))
);

-- Målretting: all-tildelte (+ admins) kan målrette alle/chain/hvilken som helst;
-- butikk-scopede kun konkrete egne butikker.
drop policy if exists content_targets_write on public.content_targets;
create policy content_targets_write on public.content_targets for all
  using (
    public.user_has_all_stores()
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and public.user_can_access_store(store_id))
  )
  with check (
    public.user_has_all_stores()
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and public.user_can_access_store(store_id))
  );
