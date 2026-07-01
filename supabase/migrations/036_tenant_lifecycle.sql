-- Tenant-livssyklus: aktiv/suspendert/arkivert.
do $$ begin
  create type tenant_status as enum ('active','suspended','archived');
exception when duplicate_object then null; end $$;
alter table public.tenants add column if not exists status public.tenant_status not null default 'active';
alter table public.tenants add column if not exists archived_at timestamptz;
