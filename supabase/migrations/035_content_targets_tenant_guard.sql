-- KRITISK tenant-isolasjon: content_targets_write hadde ingen tenant-grense på
-- admin-grenen (user_has_all_stores() = true for super_admin OG chain_manager).
-- content_targets har ingen tenant_id-kolonne, så en chain_manager i tenant A
-- kunne skrive targeting-rader (f.eks. target_all) mot en ANNEN tenants innhold.
-- Verifisert empirisk: Mobile chain_manager klarte å legge target_all på
-- Gange-Rolv-innhold.
--
-- Fix: admin-grenen krever nå at content_item tilhører brukerens egen tenant
-- (super_admin uendret — full tilgang, jf. act-as). Butikk-grenen uendret.

drop policy if exists content_targets_write on public.content_targets;
create policy content_targets_write on public.content_targets
  for all
  using (
    (user_has_all_stores() and exists (
       select 1 from public.content_items ci
       where ci.id = content_targets.content_item_id
         and (public.get_my_role() = 'super_admin' or ci.tenant_id = public.get_my_tenant_id())
    ))
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and user_can_access_store(store_id))
  )
  with check (
    (user_has_all_stores() and exists (
       select 1 from public.content_items ci
       where ci.id = content_targets.content_item_id
         and (public.get_my_role() = 'super_admin' or ci.tenant_id = public.get_my_tenant_id())
    ))
    or (target_all = false and chain_id is null and tag_id is null and store_id is not null and user_can_access_store(store_id))
  );
