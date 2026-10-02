-- Keep the full Habi response fields for each listing, plus a history of
-- successful/failed catalog synchronization runs. These tables are private:
-- the server uses service_role and returns only the fields needed by the site.
create table public.habi_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  properties_received integer not null default 0 check (properties_received >= 0),
  properties_saved integer not null default 0 check (properties_saved >= 0),
  pages_received integer not null default 0 check (pages_received >= 0),
  total_reported integer check (total_reported is null or total_reported >= 0),
  response_metadata jsonb not null default '[]'::jsonb,
  error_code text
);

create table public.habi_properties (
  storage_key text primary key,
  external_uuid text,
  property_id text,
  title text,
  description text,
  sale_price numeric,
  area numeric,
  room_count numeric,
  bathroom_count numeric,
  garage_count numeric,
  property_type jsonb,
  city text,
  neighborhood text,
  address text,
  image_urls jsonb not null default '[]'::jsonb,
  publication_date text,
  source_offset integer not null default 0 check (source_offset >= 0),
  raw_data jsonb not null,
  active boolean not null default true,
  last_seen_run uuid references public.habi_sync_runs(id) on delete set null,
  first_imported_at timestamptz not null default now(),
  last_imported_at timestamptz not null default now()
);

-- Pages are staged under a run ID so a failed or incomplete API pagination
-- never partially replaces the catalog shown to visitors.
create table public.habi_sync_staging (
  run_id uuid not null references public.habi_sync_runs(id) on delete cascade,
  storage_key text not null,
  external_uuid text,
  property_id text,
  title text,
  description text,
  sale_price numeric,
  area numeric,
  room_count numeric,
  bathroom_count numeric,
  garage_count numeric,
  property_type jsonb,
  city text,
  neighborhood text,
  address text,
  image_urls jsonb not null default '[]'::jsonb,
  publication_date text,
  source_offset integer not null default 0 check (source_offset >= 0),
  raw_data jsonb not null,
  primary key (run_id, storage_key)
);

create unique index habi_properties_external_uuid_unique
  on public.habi_properties(external_uuid) where external_uuid is not null;
create index habi_properties_active_publication
  on public.habi_properties(active, publication_date desc nulls last);
create index habi_properties_active_title
  on public.habi_properties(active, title);
create index habi_properties_last_seen_run
  on public.habi_properties(last_seen_run);
create index habi_sync_runs_started_at
  on public.habi_sync_runs(started_at desc);

alter table public.habi_properties enable row level security;
alter table public.habi_sync_runs enable row level security;
alter table public.habi_sync_staging enable row level security;

revoke all on public.habi_properties, public.habi_sync_runs, public.habi_sync_staging from anon, authenticated;
grant select, insert, update, delete on public.habi_properties, public.habi_sync_runs, public.habi_sync_staging to service_role;

create or replace function public.finalize_habi_catalog_sync(
  p_run_id uuid,
  p_properties_received integer,
  p_properties_saved integer,
  p_pages_received integer,
  p_total_reported integer,
  p_response_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;
  if not exists (select 1 from public.habi_sync_runs r where r.id = p_run_id and r.status = 'running') then
    raise exception 'sync run is not active';
  end if;
  if p_total_reported is not null and p_properties_received < p_total_reported then
    raise exception 'sync did not receive the reported total';
  end if;

  insert into public.habi_properties (
    storage_key, external_uuid, property_id, title, description, sale_price, area,
    room_count, bathroom_count, garage_count, property_type, city, neighborhood,
    address, image_urls, publication_date, source_offset, raw_data, active,
    last_seen_run, last_imported_at
  )
  select s.storage_key, s.external_uuid, s.property_id, s.title, s.description,
    s.sale_price, s.area, s.room_count, s.bathroom_count, s.garage_count,
    s.property_type, s.city, s.neighborhood, s.address, s.image_urls,
    s.publication_date, s.source_offset, s.raw_data, true, p_run_id, now()
  from public.habi_sync_staging s
  where s.run_id = p_run_id
  on conflict (storage_key) do update set
    external_uuid = excluded.external_uuid,
    property_id = excluded.property_id,
    title = excluded.title,
    description = excluded.description,
    sale_price = excluded.sale_price,
    area = excluded.area,
    room_count = excluded.room_count,
    bathroom_count = excluded.bathroom_count,
    garage_count = excluded.garage_count,
    property_type = excluded.property_type,
    city = excluded.city,
    neighborhood = excluded.neighborhood,
    address = excluded.address,
    image_urls = excluded.image_urls,
    publication_date = excluded.publication_date,
    source_offset = excluded.source_offset,
    raw_data = excluded.raw_data,
    active = true,
    last_seen_run = p_run_id,
    last_imported_at = now();

  update public.habi_properties p
  set active = false
  where p.active = true and p.last_seen_run is distinct from p_run_id;

  update public.habi_sync_runs r
  set status = 'succeeded',
    finished_at = now(),
    properties_received = p_properties_received,
    properties_saved = p_properties_saved,
    pages_received = p_pages_received,
    total_reported = p_total_reported,
    response_metadata = coalesce(p_response_metadata, '[]'::jsonb),
    error_code = null
  where r.id = p_run_id;

  delete from public.habi_sync_staging s where s.run_id = p_run_id;
end;
$$;

revoke all on function public.finalize_habi_catalog_sync(uuid, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.finalize_habi_catalog_sync(uuid, integer, integer, integer, integer, jsonb) to service_role;
