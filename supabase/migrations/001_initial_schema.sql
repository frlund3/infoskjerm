-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type chain_type as enum ('EUROSPAR', 'JOKER', 'SPAR');
create type user_role as enum ('super_admin', 'chain_manager', 'store_manager', 'store_employee');
create type content_type as enum ('news', 'competition', 'stats', 'weather', 'slide');
create type content_status as enum ('draft', 'pending_approval', 'approved', 'rejected', 'archived');
create type screen_status as enum ('active', 'inactive', 'maintenance');

-- Tenants (multitenant foundation)
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Chains (EUROSPAR, JOKER, SPAR)
create table chains (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  name chain_type not null,
  color text not null default '#000000',
  created_at timestamptz default now(),
  unique(tenant_id, name)
);

-- Stores
create table stores (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  chain_id uuid references chains(id) not null,
  name text not null,
  company_name text not null,
  org_number text not null,
  gln text not null,
  email text not null,
  city text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz default now()
);

-- Tags
create table tags (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now(),
  unique(tenant_id, name)
);

-- Store <-> Tags (many-to-many)
create table store_tags (
  store_id uuid references stores(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (store_id, tag_id)
);

-- Screens (each physical screen in a store)
create table screens (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  token text unique not null,
  status screen_status default 'active',
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- Users (linked to Supabase Auth via id)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade not null,
  email text not null,
  full_name text not null,
  role user_role not null default 'store_employee',
  chain_id uuid references chains(id),
  created_at timestamptz default now()
);

-- User <-> Stores (store_manager/employee can belong to multiple stores)
create table user_stores (
  user_id uuid references users(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  primary key (user_id, store_id)
);

-- Content items
create table content_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  type content_type not null,
  title text not null,
  body jsonb not null default '{}',
  status content_status default 'draft',
  created_by uuid references users(id) not null,
  approved_by uuid references users(id),
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Content targeting (which stores/chains/tags see this content)
create table content_targets (
  id uuid primary key default uuid_generate_v4(),
  content_item_id uuid references content_items(id) on delete cascade not null,
  target_all boolean default false,
  chain_id uuid references chains(id),
  store_id uuid references stores(id),
  tag_id uuid references tags(id)
);

-- Playlists
create table playlists (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Playlist items (ordered content)
create table playlist_items (
  id uuid primary key default uuid_generate_v4(),
  playlist_id uuid references playlists(id) on delete cascade not null,
  content_item_id uuid references content_items(id) on delete cascade not null,
  position integer not null default 0,
  duration_seconds integer not null default 15
);

-- Screen <-> Playlists
create table screen_playlists (
  screen_id uuid references screens(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete cascade,
  priority integer default 0,
  primary key (screen_id, playlist_id)
);

-- Row Level Security
alter table tenants enable row level security;
alter table chains enable row level security;
alter table stores enable row level security;
alter table tags enable row level security;
alter table store_tags enable row level security;
alter table screens enable row level security;
alter table users enable row level security;
alter table user_stores enable row level security;
alter table content_items enable row level security;
alter table content_targets enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;
alter table screen_playlists enable row level security;

-- Helper function: get current user's tenant_id
create or replace function get_my_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from users where id = auth.uid()
$$;

-- Helper function: get current user's role
create or replace function get_my_role()
returns user_role language sql security definer stable as $$
  select role from users where id = auth.uid()
$$;

-- RLS Policies: users can only see data in their own tenant
create policy "tenant_isolation" on chains for all using (tenant_id = get_my_tenant_id());
create policy "tenant_isolation" on stores for all using (tenant_id = get_my_tenant_id());
create policy "tenant_isolation" on tags for all using (tenant_id = get_my_tenant_id());
create policy "tenant_isolation" on screens for all using (tenant_id = get_my_tenant_id());
create policy "tenant_isolation" on content_items for all using (tenant_id = get_my_tenant_id());
create policy "tenant_isolation" on playlists for all using (tenant_id = get_my_tenant_id());

-- Store_tags visible within tenant
create policy "tenant_isolation" on store_tags for all using (
  exists (select 1 from stores s where s.id = store_id and s.tenant_id = get_my_tenant_id())
);

-- Users can see other users in same tenant
create policy "tenant_isolation" on users for all using (tenant_id = get_my_tenant_id());

-- Screens: also allow read via token (for display devices, no auth)
create policy "screen_token_read" on screens for select using (true);

-- Seed data: Gange-Rolv tenant
insert into tenants (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Gange-Rolv AS', 'gange-rolv');

insert into chains (id, tenant_id, name, color) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'EUROSPAR', '#E30613'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'JOKER', '#F7A600'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'SPAR', '#007B40');

insert into stores (tenant_id, chain_id, name, company_name, org_number, gln, email, city) values
  -- EUROSPAR
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR BLINDHEIM', 'BLINDHEIM MAT AS', '982121612', '7080000884582', 'eurospar.blindheim@spar.no', 'Ålesund'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR HAREID', 'SPAR-KJØP AS', '937471297', '7080000025220', 'eurospar.hareid@spar.no', 'Hareid'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR LARSGÅRDEN', 'LARSGÅRDEN MAT AS', '928182894', '7080004256750', 'eurospar.larsgarden@spar.no', 'Ålesund'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR MOA', 'MOA MAT AS', '995711907', '7080003431554', 'eurospar.moa@spar.no', 'Ålesund'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR ÅLESUND STORSENTER', 'GRIMMERMAT AS', '979983557', '7080000620753', 'spar.alesund-storsenter@spar.no', 'Ålesund'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'EUROSPAR ØRSTA', 'FJORDTORGET MAT AS', '888031502', '7080001090708', 'eurospar.orsta@spar.no', 'Ørsta'),
  -- JOKER
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'JOKER GODØY', 'MIDTBØ HANDEL AS', '989111787', '7080001100599', 'joker.god@joker.no', 'Giske'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'JOKER ÅHEIM', 'OSNES MAT AS', '951969540', '7080001460440', 'joker.aheim@joker.no', 'Sande'),
  -- SPAR
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR ELLINGSØY', 'ELLINGSØY LAVPRIS AS', '846008152', '7080000396399', 'spar.ellingsoy@spar.no', 'Ålesund'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR HORNINDAL', 'HORNINDAL MAT AS', '998993636', '7080001285746', 'spar.hornindal@spar.no', 'Hornindal'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR LANGEVÅG', 'SULA MAT AS', '932302667', '7080004404472', 'spar.langevag@spar.no', 'Sula'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR RAUDEBERG', 'RAUDEBERG MAT AS', '815078632', '7080001363093', 'spar.raudeberg@spar.no', 'Vågsøy'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR STRAUMANE', 'STRAUMANE MAT AS', '991255095', '7080001137793', 'spar.straumane@spar.no', 'Ørsta'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR TRESFJORD', 'TRESFJORDMAT AS', '980021335', '7080000602322', 'spar.tresfjord@spar.no', 'Vestnes'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR ULSTEINVIK', 'ULSTEIN MAT AS', '927794373', '7080004241213', 'spar.ulsteinvik@spar.no', 'Ulstein'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'SPAR FISKÅ', 'FISKÅ MAT AS', '000000000', '0000000000000', 'spar.fiskaa@spar.no', 'Ørsta');

-- Default tags
insert into tags (tenant_id, name, color) values
  ('00000000-0000-0000-0000-000000000001', 'SUNNMØRE', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000001', 'NORDFJORD', '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000001', 'STORBY', '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'ØYBUTIKK', '#10b981');
