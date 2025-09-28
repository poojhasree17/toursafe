-- Enable PostGIS extension
create extension if not exists postgis;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (dashboard operators)
create table app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('ADMIN','OPERATOR')),
  created_at timestamptz default now()
);

-- Tourists (VC-based identity)
create table tourists (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  vc_jwt text not null,                 -- W3C VC (JWT)
  vc_sha256 text not null,              -- hex hash of VC
  chain_tx_hash text,                   -- polygon amoy tx hash for proof
  emergency_contact text,
  lang text default 'en',
  active boolean default true,
  created_at timestamptz default now()
);

-- Create unique index on vc_sha256 for fast lookups
create unique index on tourists (vc_sha256);

-- Zones (GeoJSON → geometry)
create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('SAFE','RESTRICTED','ALERT')),
  polygon_geojson jsonb not null,
  geom geometry(MultiPolygon, 4326) generated always as (
    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(polygon_geojson::text), 4326))
  ) stored,
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

-- GPS pings
create table pings (
  id bigserial primary key,
  tourist_id uuid not null references tourists(id) on delete cascade,
  ts timestamptz not null default now(),
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  speed double precision check (speed >= 0),       -- m/s (optional)
  bearing double precision check (bearing >= 0 and bearing <= 360)      -- 0..360
);

-- Incidents
create table incidents (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid references tourists(id),
  type text not null check (type in ('SOS','IMMOBILE','RESTRICTED','DEVIATION')),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH')) default 'MEDIUM',
  ts timestamptz not null default now(),
  lat double precision check (lat >= -90 and lat <= 90),
  lng double precision check (lng >= -180 and lng <= 180),
  status text not null check (status in ('OPEN','ACK','CLOSED')) default 'OPEN',
  responder uuid references app_users(id),
  chain_tx_hash text,            -- optional on-chain anchor of incident hash
  meta jsonb default '{}'::jsonb
);

-- Device tokens for push notifications
create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid references tourists(id) on delete cascade,
  user_id uuid references app_users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('web', 'android', 'ios')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Constraint: either tourist_id or user_id must be set, but not both
  check ((tourist_id is not null and user_id is null) or (tourist_id is null and user_id is not null))
);

-- Indexes for performance
create index on pings (tourist_id, ts desc);
create index on pings (ts desc) where ts > now() - interval '1 day'; -- Recent pings
create index on zones using gist (geom);
create index on incidents (status) where status in ('OPEN', 'ACK');
create index on incidents (ts desc);
create index on device_tokens (tourist_id);
create index on device_tokens (user_id);

-- Spatial index on pings for geospatial queries
create index on pings using gist (ST_Point(lng, lat));

-- RLS (Row Level Security) policies
alter table app_users enable row level security;
alter table tourists enable row level security;
alter table zones enable row level security;
alter table pings enable row level security;
alter table incidents enable row level security;
alter table device_tokens enable row level security;

-- Policy: App users can read all data (for dashboard)
create policy "App users can read all" on app_users
  for select using (true);

create policy "App users can read tourists" on tourists
  for select using (true);

create policy "App users can read zones" on zones
  for select using (true);

create policy "App users can read pings" on pings
  for select using (true);

create policy "App users can read incidents" on incidents
  for select using (true);

create policy "App users can manage incidents" on incidents
  for update using (true);

create policy "App users can create incidents" on incidents
  for insert with check (true);

-- Policy: Tourists can insert their own pings (using app-level auth)
create policy "Tourists can insert pings" on pings
  for insert with check (true); -- App-level validation will handle tourist_id matching

-- Policy: Public can read zones (for map display)
create policy "Public can read zones" on zones
  for select using (true);

-- Policy: Public can create incidents (SOS)
create policy "Public can create incidents" on incidents
  for insert with check (true);

-- Functions for geospatial queries

-- Function to check which zones a point intersects
create or replace function get_intersecting_zones(lat double precision, lng double precision)
returns table(zone_id uuid, zone_name text, zone_type text)
language sql stable
as $$
  select z.id, z.name, z.type
  from zones z
  where ST_Intersects(ST_SetSRID(ST_Point(lng, lat), 4326), z.geom);
$$;

-- Function to get recent pings for a tourist
create or replace function get_recent_pings(tourist_uuid uuid, minutes_back integer default 10)
returns setof pings
language sql stable
as $$
  select *
  from pings
  where tourist_id = tourist_uuid
    and ts > now() - (minutes_back || ' minutes')::interval
  order by ts desc;
$$;

-- Function to calculate distance between two points in meters
create or replace function calculate_distance(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql immutable
as $$
  select ST_Distance(
    ST_Transform(ST_SetSRID(ST_Point(lng1, lat1), 4326), 3857),
    ST_Transform(ST_SetSRID(ST_Point(lng2, lat2), 4326), 3857)
  );
$$;

-- Trigger to update device_tokens updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_device_tokens_updated_at
  before update on device_tokens
  for each row execute procedure update_updated_at_column();
