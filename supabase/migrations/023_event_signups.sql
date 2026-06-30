-- Påmeldinger til invitasjoner (julebord, sommerfest, kurs …).
-- Skrives fra den offentlige /pamelding/<id>-siden via en server action med
-- service-role (RLS-en under blokkerer derfor anon/auth — listen er privat,
-- akkurat som kundeklubb_members). Admin leser den via service-role i admin.
create table if not exists public.event_signups (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  store_id uuid references public.stores (id) on delete set null,
  name text not null,
  department text,
  guests integer not null default 0,
  dietary text,
  comment text,
  email text,
  phone text,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists event_signups_content_item_id_idx
  on public.event_signups (content_item_id);

alter table public.event_signups enable row level security;

-- Ingen policy for anon/authenticated → tabellen er privat. All tilgang skjer
-- via service-role (server actions / admin), som omgår RLS.
