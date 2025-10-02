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

-- Family tracking relationships for location sharing
create table family_tracking (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid not null references tourists(id) on delete cascade,
  family_member_email text not null,
  family_member_name text not null,
  relationship text not null check (relationship in ('parent', 'spouse', 'sibling', 'child', 'guardian', 'other')),
  consent_given boolean default true,
  consent_timestamp timestamptz default now(),
  expires_at timestamptz, -- Optional expiration for temporary sharing
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Family member access tokens for secure location viewing
create table family_access_tokens (
  id uuid primary key default gen_random_uuid(),
  family_tracking_id uuid not null references family_tracking(id) on delete cascade,
  token_hash text not null unique, -- Hashed token for security
  expires_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

-- E-FIR (Electronic First Information Report) records
create table efirs (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid not null references tourists(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  fir_number text unique not null, -- Auto-generated FIR number
  complainant_name text not null,
  complainant_address text,
  complainant_phone text,
  incident_type text not null check (incident_type in ('MISSING_PERSON', 'THEFT', 'ASSAULT', 'ACCIDENT', 'OTHER')),
  incident_description text not null,
  incident_location text,
  incident_datetime timestamptz not null,
  witnesses jsonb default '[]'::jsonb, -- Array of witness information
  evidence jsonb default '[]'::jsonb, -- Array of evidence references
  police_station text,
  investigating_officer text,
  status text not null check (status in ('DRAFT', 'SUBMITTED', 'UNDER_INVESTIGATION', 'CLOSED')) default 'DRAFT',
  blockchain_hash text, -- Hash of FIR for blockchain verification
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  submitted_at timestamptz
);

-- IoT Devices (Smart bands, tags, wearables)
create table iot_devices (
  id uuid primary key default gen_random_uuid(),
  tourist_id uuid not null references tourists(id) on delete cascade,
  device_id text unique not null, -- Unique device identifier (e.g., MAC address, serial number)
  device_type text not null check (device_type in ('SMART_BAND', 'GPS_TAG', 'HEALTH_MONITOR', 'EMERGENCY_BUTTON')),
  device_name text not null,
  manufacturer text,
  model text,
  firmware_version text,
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  is_active boolean default true,
  last_seen timestamptz,
  registered_at timestamptz default now(),
  settings jsonb default '{}'::jsonb, -- Device-specific configuration
  status text not null check (status in ('REGISTERED', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED')) default 'REGISTERED'
);

-- IoT Device Data Points (Health, location, emergency signals)
create table iot_data_points (
  id bigserial primary key,
  device_id uuid not null references iot_devices(id) on delete cascade,
  data_type text not null check (data_type in ('LOCATION', 'HEART_RATE', 'TEMPERATURE', 'FALL_DETECTED', 'EMERGENCY_BUTTON', 'BATTERY_LEVEL', 'STEP_COUNT')),
  value numeric, -- The actual sensor reading
  unit text, -- Unit of measurement (e.g., 'bpm', 'celsius', 'meters')
  location_lat double precision check (location_lat >= -90 and location_lat <= 90),
  location_lng double precision check (location_lng >= -180 and location_lng <= 180),
  metadata jsonb default '{}'::jsonb, -- Additional device-specific data
  recorded_at timestamptz not null default now(),
  processed_at timestamptz, -- When this data point was processed by the system
  alert_generated boolean default false -- Whether this data point triggered an alert
);

-- IoT Device Alerts (Generated from abnormal readings)
create table iot_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references iot_devices(id) on delete cascade,
  data_point_id bigint references iot_data_points(id),
  alert_type text not null check (alert_type in ('HIGH_HEART_RATE', 'LOW_BATTERY', 'FALL_DETECTED', 'EMERGENCY_SIGNAL', 'DEVICE_OFFLINE', 'LOCATION_DEVIATION')),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) default 'MEDIUM',
  message text not null,
  acknowledged boolean default false,
  acknowledged_by uuid references app_users(id),
  acknowledged_at timestamptz,
  resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for performance
create index on pings (tourist_id, ts desc);
-- create index on pings (ts desc) where ts > now() - interval '1 day'; -- Recent pings (disabled - uses volatile function)
create index on zones using gist (geom);
create index on incidents (status) where status in ('OPEN', 'ACK');
create index on incidents (ts desc);
create index on device_tokens (tourist_id);
create index on device_tokens (user_id);
create index on family_tracking (tourist_id);
create index on family_tracking (family_member_email);
create index on family_tracking (is_active) where is_active = true;
create index on family_access_tokens (family_tracking_id);
create index on family_access_tokens (token_hash) where is_active = true;
create index on efirs (tourist_id);
create index on efirs (fir_number);
create index on efirs (status) where status in ('DRAFT', 'SUBMITTED');
create index on efirs (incident_datetime desc);
create index on iot_devices (tourist_id);
create index on iot_devices (device_id);
create index on iot_devices (status) where status = 'ACTIVE';
create index on iot_data_points (device_id, recorded_at desc);
create index on iot_data_points (data_type, recorded_at desc);
create index on iot_alerts (device_id, created_at desc);
create index on iot_alerts (alert_type);
create index on iot_alerts (acknowledged) where acknowledged = false;

-- Spatial index on pings for geospatial queries
-- Note: Create this index manually after running migrations if needed:
-- create index on pings using gist (ST_Point(lng, lat));

-- RLS (Row Level Security) policies
alter table app_users enable row level security;
alter table tourists enable row level security;
alter table zones enable row level security;
alter table pings enable row level security;
alter table incidents enable row level security;
alter table device_tokens enable row level security;
alter table family_tracking enable row level security;
alter table family_access_tokens enable row level security;
alter table efirs enable row level security;
alter table iot_devices enable row level security;
alter table iot_data_points enable row level security;
alter table iot_alerts enable row level security;

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

-- Family tracking policies
create policy "Tourists can manage their family tracking" on family_tracking
  for all using (true); -- App-level validation will handle tourist_id matching

create policy "Family members can view their tracking relationships" on family_tracking
  for select using (family_member_email = current_setting('app.current_user_email', true));

create policy "Tourists can manage their access tokens" on family_access_tokens
  for all using (true); -- Managed through family_tracking relationship

create policy "Family members can use their access tokens" on family_access_tokens
  for select using (is_active = true and expires_at > now());

-- E-FIR policies
create policy "Tourists can manage their E-FIRs" on efirs
  for all using (true); -- App-level validation will handle tourist_id matching

create policy "App users can read all E-FIRs" on efirs
  for select using (true);

create policy "App users can update E-FIR status" on efirs
  for update using (true);

-- IoT Device policies
create policy "Tourists can manage their IoT devices" on iot_devices
  for all using (true); -- App-level validation will handle tourist_id matching

create policy "App users can read all IoT devices" on iot_devices
  for select using (true);

create policy "IoT devices can insert their data" on iot_data_points
  for insert with check (true); -- Device authentication handled at API level

create policy "App users can read IoT data" on iot_data_points
  for select using (true);

create policy "Tourists can view their IoT alerts" on iot_alerts
  for select using (
    device_id in (
      select id from iot_devices where tourist_id in (
        select id from tourists where id = current_setting('app.current_tourist_id', true)::uuid
      )
    )
  );

create policy "App users can manage IoT alerts" on iot_alerts
  for all using (true);

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
