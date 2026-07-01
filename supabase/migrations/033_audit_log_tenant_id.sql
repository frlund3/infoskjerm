-- Legg tenant_id på audit_log så logg-visning kan scopes per tenant (act-as).
alter table public.audit_log add column if not exists tenant_id uuid references public.tenants(id);
-- Backfill fra aktørens tenant der vi har user_id.
update public.audit_log a
  set tenant_id = u.tenant_id
  from public.users u
  where a.user_id = u.id and a.tenant_id is null;
create index if not exists audit_log_tenant_id_idx on public.audit_log(tenant_id);
