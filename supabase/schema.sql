-- Esquema inicial de referencia para eXIn Grupo.
-- Revisar y ejecutar solo después de crear un proyecto Supabase y configurar
-- el proceso servidor de alta de solicitudes. No crea usuarios ni claves.

create extension if not exists pgcrypto;

create type public.app_role as enum ('superadmin', 'admin', 'commercial', 'advisor', 'editor');
create type public.property_operation as enum ('sale', 'rent');
create type public.property_status as enum ('draft', 'published', 'inactive', 'sold');
create type public.inquiry_kind as enum ('contact', 'credit', 'capture', 'appointment');
create type public.inquiry_status as enum ('new', 'contacted', 'follow_up', 'appointment', 'negotiation', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'advisor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email), 'commercial')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.active = true
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer
set search_path = ''
as $$ select coalesce(public.current_app_role() in ('superadmin', 'admin', 'advisor'), false) $$;

create or replace function public.can_manage_properties()
returns boolean language sql stable security definer
set search_path = ''
as $$ select coalesce(public.current_app_role() in ('superadmin', 'admin'), false) $$;

create or replace function public.can_manage_inquiries()
returns boolean language sql stable security definer
set search_path = ''
as $$ select coalesce(public.current_app_role() in ('superadmin', 'admin', 'commercial'), false) $$;

create or replace function public.can_manage_content()
returns boolean language sql stable security definer
set search_path = ''
as $$ select coalesce(public.current_app_role() in ('superadmin', 'admin', 'editor'), false) $$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  verification_code text not null unique,
  slug text not null unique,
  title text not null,
  operation public.property_operation not null,
  property_type text not null,
  price numeric(16,2),
  city text,
  neighborhood text,
  description text,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(3,1) check (bathrooms is null or bathrooms >= 0),
  area_m2 numeric(10,2) check (area_m2 is null or area_m2 > 0),
  status public.property_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_featured or status = 'published')
);

-- Serializa cambios de destacadas para que dos publicaciones simultáneas no
-- superen el máximo de cinco inmuebles activos destacados.
create or replace function public.enforce_featured_property_limit()
returns trigger language plpgsql
set search_path = ''
as $$
declare featured_count integer;
begin
  if new.status <> 'published' then
    new.is_featured := false;
  end if;
  if new.is_featured then
    perform pg_advisory_xact_lock(hashtext('exin-featured-property-limit'));
    select count(*) into featured_count from public.properties p
      where p.is_featured and p.status = 'published' and p.id <> new.id;
    if featured_count >= 5 then
      raise exception 'No se pueden publicar más de cinco propiedades destacadas';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger properties_featured_limit
before insert or update of status, is_featured on public.properties
for each row execute function public.enforce_featured_property_limit();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  unique(property_id, storage_path)
);
create unique index one_cover_image_per_property
  on public.property_images(property_id) where is_cover;

-- PII permanece privada. Los formularios públicos deben entrar por una ruta
-- servidor validada y limitada; nunca habilitar INSERT anónimo directo.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind public.inquiry_kind not null,
  full_name text not null,
  phone text not null,
  email text not null,
  message text,
  property_id uuid references public.properties(id) on delete set null,
  property_code text,
  requested_financing text,
  property_type text,
  operation public.property_operation,
  city text,
  neighborhood text,
  expected_price numeric(16,2),
  area_m2 numeric(10,2),
  bedrooms integer,
  bathrooms numeric(3,1),
  parking_spaces integer,
  preferred_contact text,
  status public.inquiry_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  consent_recorded_at timestamptz not null,
  consent_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_assignee_status_created
  on public.inquiries(assigned_to, status, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Public content is data so approved staff can update it without code changes.
create table public.site_modules (
  module_key text primary key,
  content jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table public.site_settings (
  setting_key text primary key,
  value jsonb not null default 'null'::jsonb,
  is_public boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table public.private_settings (
  setting_key text primary key,
  value text not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Colombia',
  department text,
  city text not null,
  zone text,
  active boolean not null default true,
  sort_order integer not null default 0,
  unique(country, department, city, zone)
);
create unique index locations_unique_label
  on public.locations(country, coalesce(department, ''), city, coalesce(zone, ''));
create table public.property_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  appointment_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  advisor_id uuid references public.profiles(id) on delete set null,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled','rescheduled')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_starts_at on public.appointments(starts_at, status);

create or replace function public.prevent_advisor_double_booking()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.advisor_id is not null and new.status in ('requested','confirmed') then
    perform pg_advisory_xact_lock(hashtextextended(new.advisor_id::text, 2));
    if exists (select 1 from public.appointments a where a.id <> new.id and a.advisor_id = new.advisor_id and a.status in ('requested','confirmed') and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')) then
      raise exception 'El asesor ya tiene una cita en ese horario';
    end if;
  end if;
  return new;
end $$;
create trigger appointments_no_double_booking
before insert or update of advisor_id, starts_at, ends_at, status on public.appointments
for each row execute function public.prevent_advisor_double_booking();

create table public.inquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 3145728),
  created_at timestamptz not null default now()
);

create or replace function public.enforce_inquiry_attachment_limit()
returns trigger language plpgsql
set search_path = ''
as $$
declare attachment_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.inquiry_id::text, 3));
  select count(*) into attachment_count from public.inquiry_attachments a where a.inquiry_id = new.inquiry_id;
  if attachment_count >= 6 then
    raise exception 'Una solicitud puede tener hasta seis fotografías';
  end if;
  return new;
end $$;
create trigger inquiry_attachments_max_six
before insert on public.inquiry_attachments
for each row execute function public.enforce_inquiry_attachment_limit();

create table public.submission_rate_limits (
  ip_digest text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  alt_text text not null,
  content_type text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.audit_log enable row level security;
alter table public.site_modules enable row level security;
alter table public.site_settings enable row level security;
alter table public.private_settings enable row level security;
alter table public.locations enable row level security;
alter table public.property_types enable row level security;
alter table public.appointments enable row level security;
alter table public.inquiry_attachments enable row level security;
alter table public.submission_rate_limits enable row level security;
alter table public.media_assets enable row level security;

create policy "profiles read self or management" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.current_app_role() in ('superadmin','admin'));
create policy "superadmin manages profiles" on public.profiles
for all to authenticated
using (public.current_app_role() = 'superadmin')
with check (public.current_app_role() = 'superadmin');

create policy "published properties are public" on public.properties
for select to anon, authenticated
using (status = 'published' or public.is_staff());
create policy "admins manage properties" on public.properties
for insert to authenticated with check (public.can_manage_properties());
create policy "admins update properties" on public.properties
for update to authenticated using (public.can_manage_properties())
with check (public.can_manage_properties());
create policy "superadmins delete properties" on public.properties
for delete to authenticated using (public.current_app_role() = 'superadmin');

create policy "published property images readable" on public.property_images
for select to anon, authenticated
using (exists (select 1 from public.properties p where p.id = property_id and p.status = 'published') or public.is_staff());
create policy "admins manage property images" on public.property_images
for all to authenticated using (public.can_manage_properties())
with check (public.can_manage_properties());

create policy "authorized staff manage inquiries" on public.inquiries
for all to authenticated using (public.can_manage_inquiries())
with check (public.can_manage_inquiries());
create policy "advisors read assigned inquiries" on public.inquiries
for select to authenticated using (assigned_to = (select auth.uid()) and public.current_app_role() = 'advisor');
create policy "advisors update assigned inquiries" on public.inquiries
for update to authenticated using (assigned_to = (select auth.uid()) and public.current_app_role() = 'advisor')
with check (assigned_to = (select auth.uid()) and public.current_app_role() = 'advisor');

create policy "superadmins read audit log" on public.audit_log
for select to authenticated using (public.current_app_role() = 'superadmin');
create policy "staff append audit log" on public.audit_log
for insert to authenticated with check (actor_id = (select auth.uid()) and public.is_staff());

create policy "enabled site modules are public" on public.site_modules
for select to anon, authenticated using (enabled or public.can_manage_content());
create policy "content managers manage modules" on public.site_modules
for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy "public settings are readable" on public.site_settings
for select to anon, authenticated using (is_public or public.current_app_role() in ('superadmin','admin'));
create policy "admins manage site settings" on public.site_settings
for all to authenticated using (public.current_app_role() in ('superadmin','admin'))
with check (public.current_app_role() in ('superadmin','admin'));
create policy "admins manage private settings" on public.private_settings
for all to authenticated using (public.current_app_role() in ('superadmin','admin'))
with check (public.current_app_role() in ('superadmin','admin'));
create policy "active locations are public" on public.locations
for select to anon, authenticated using (active or public.current_app_role() in ('superadmin','admin'));
create policy "admins manage locations" on public.locations
for all to authenticated using (public.current_app_role() in ('superadmin','admin'))
with check (public.current_app_role() in ('superadmin','admin'));
create policy "active property types are public" on public.property_types
for select to anon, authenticated using (active or public.current_app_role() in ('superadmin','admin'));
create policy "admins manage property types" on public.property_types
for all to authenticated using (public.current_app_role() in ('superadmin','admin'))
with check (public.current_app_role() in ('superadmin','admin'));
create policy "admins and assigned advisors manage appointments" on public.appointments
for all to authenticated using (public.current_app_role() in ('superadmin','admin','commercial') or advisor_id = (select auth.uid()))
with check (public.current_app_role() in ('superadmin','admin','commercial') or advisor_id = (select auth.uid()));
create policy "staff read attachments for authorized inquiries" on public.inquiry_attachments
for select to authenticated using (
  exists (select 1 from public.inquiries i where i.id = inquiry_id and (public.can_manage_inquiries() or i.assigned_to = (select auth.uid())))
);

-- Public objects hold only published, approved listing photographs. Private
-- contact/capture attachments use a separate private bucket and server upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intake-attachments', 'intake-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "property managers upload listing images" on storage.objects
for insert to authenticated with check (bucket_id = 'property-images' and public.can_manage_properties());
create policy "property managers update listing images" on storage.objects
for update to authenticated using (bucket_id = 'property-images' and public.can_manage_properties())
with check (bucket_id = 'property-images' and public.can_manage_properties());
create policy "property managers delete listing images" on storage.objects
for delete to authenticated using (bucket_id = 'property-images' and public.can_manage_properties());
create policy "content managers upload site media" on storage.objects
for insert to authenticated with check (bucket_id = 'site-media' and public.can_manage_content());
create policy "content managers update site media" on storage.objects
for update to authenticated using (bucket_id = 'site-media' and public.can_manage_content())
with check (bucket_id = 'site-media' and public.can_manage_content());
create policy "content managers delete site media" on storage.objects
for delete to authenticated using (bucket_id = 'site-media' and public.can_manage_content());
create policy "content managers view media library" on public.media_assets
for select to authenticated using (public.can_manage_content());
create policy "content managers update media library" on public.media_assets
for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());

create or replace function public.set_property_cover(p_property_id uuid, p_image_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_property_id::text, 1));
  if not exists (select 1 from public.property_images where id = p_image_id and property_id = p_property_id) then
    raise exception 'Image not found for property';
  end if;
  update public.property_images set is_cover = false where property_id = p_property_id and is_cover = true;
  update public.property_images set is_cover = true where id = p_image_id and property_id = p_property_id;
end $$;
revoke all on function public.set_property_cover(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_property_cover(uuid, uuid) to service_role;

-- Only the trusted server API can execute submission helpers using the
-- Supabase secret key. It stores a keyed digest, never a raw client IP.
create or replace function public.reserve_submission_slot(p_ip_digest text, p_limit integer default 6, p_window_seconds integer default 3600)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare current_count integer;
begin
  if p_ip_digest is null or length(p_ip_digest) < 32 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid submission limiter parameters';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_ip_digest, 0));
  insert into public.submission_rate_limits (ip_digest, window_started_at, request_count)
  values (p_ip_digest, now(), 1)
  on conflict (ip_digest) do update set
    request_count = case when public.submission_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1 else public.submission_rate_limits.request_count + 1 end,
    window_started_at = case when public.submission_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now() else public.submission_rate_limits.window_started_at end
  returning request_count into current_count;
  return current_count <= p_limit;
end $$;
revoke all on function public.reserve_submission_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_submission_slot(text, integer, integer) to service_role;

create or replace function public.create_public_inquiry(
  p_id uuid, p_kind public.inquiry_kind, p_full_name text, p_phone text, p_email text,
  p_message text, p_property_id uuid, p_property_code text, p_requested_financing text,
  p_property_type text, p_city text, p_neighborhood text, p_consent_version text,
  p_appointment_start timestamptz, p_appointment_type text
)
returns uuid language plpgsql security definer
set search_path = ''
as $$
begin
  if length(trim(p_full_name)) < 2 or length(trim(p_phone)) < 6 or length(trim(p_email)) < 5 or length(trim(p_consent_version)) < 1 then
    raise exception 'Missing required inquiry details';
  end if;
  insert into public.inquiries (id, kind, full_name, phone, email, message, property_id, property_code, requested_financing, property_type, city, neighborhood, consent_recorded_at, consent_version)
  values (p_id, p_kind, trim(p_full_name), trim(p_phone), lower(trim(p_email)), nullif(trim(p_message), ''), p_property_id, nullif(trim(p_property_code), ''), nullif(trim(p_requested_financing), ''), nullif(trim(p_property_type), ''), nullif(trim(p_city), ''), nullif(trim(p_neighborhood), ''), now(), trim(p_consent_version));
  if p_kind = 'appointment' then
    if p_appointment_start is null or p_appointment_start <= now() or p_appointment_start > now() + interval '365 days' or length(trim(coalesce(p_appointment_type,''))) < 2 then
      raise exception 'Invalid appointment request';
    end if;
    insert into public.appointments (inquiry_id, property_id, client_name, client_phone, client_email, appointment_type, starts_at, ends_at, status)
    values (p_id, p_property_id, trim(p_full_name), trim(p_phone), lower(trim(p_email)), trim(p_appointment_type), p_appointment_start, p_appointment_start + interval '45 minutes', 'requested');
  end if;
  return p_id;
end $$;
revoke all on function public.create_public_inquiry(uuid, public.inquiry_kind, text, text, text, text, uuid, text, text, text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.create_public_inquiry(uuid, public.inquiry_kind, text, text, text, text, uuid, text, text, text, text, text, text, timestamptz, text) to service_role;

grant usage on schema public to anon, authenticated;
grant select on public.properties, public.property_images to anon, authenticated;
grant select, insert, update, delete on public.properties, public.property_images,
  public.profiles, public.inquiries, public.audit_log, public.site_modules,
  public.site_settings, public.private_settings, public.locations, public.appointments to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
grant select on public.inquiry_attachments to authenticated;
grant select, insert, update, delete on public.property_types to authenticated;
grant select on public.site_modules, public.site_settings, public.locations, public.property_types to anon;
grant usage, select on sequence public.audit_log_id_seq to authenticated;

-- Trusted server routes use the Supabase service_role key. BYPASSRLS does not
-- replace SQL table grants, so grant it access to the application tables used
-- by server-side APIs and administrative workflows.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles, public.properties,
  public.property_images, public.inquiries, public.audit_log, public.site_modules,
  public.site_settings, public.private_settings, public.locations,
  public.property_types, public.appointments, public.inquiry_attachments,
  public.submission_rate_limits, public.media_assets to service_role;
grant usage, select on sequence public.audit_log_id_seq to service_role;

-- El alta del primer superadmin, las credenciales de proveedores, SMTP y los
-- textos jurídicos aprobados se completan por ambiente antes de producción.
