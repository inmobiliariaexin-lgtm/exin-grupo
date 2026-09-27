-- Permite borrar cuentas de funcionarios sin borrar el contenido comercial
-- que crearon, y borrar solicitudes junto con las citas y adjuntos asociados.
alter table public.properties
  drop constraint if exists properties_created_by_fkey,
  add constraint properties_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.site_modules
  drop constraint if exists site_modules_updated_by_fkey,
  add constraint site_modules_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.site_settings
  drop constraint if exists site_settings_updated_by_fkey,
  add constraint site_settings_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.private_settings
  drop constraint if exists private_settings_updated_by_fkey,
  add constraint private_settings_updated_by_fkey
    foreign key (updated_by) references public.profiles(id) on delete set null;

alter table public.media_assets
  drop constraint if exists media_assets_created_by_fkey,
  add constraint media_assets_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.appointments
  drop constraint if exists appointments_inquiry_id_fkey,
  add constraint appointments_inquiry_id_fkey
    foreign key (inquiry_id) references public.inquiries(id) on delete cascade;
