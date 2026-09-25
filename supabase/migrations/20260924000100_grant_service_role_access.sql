-- The Supabase service_role bypasses RLS but still needs SQL privileges on
-- tables created by the application migrations. These grants support trusted
-- server-side routes for inquiries, attachments, property photos, media and
-- audit records. The key must remain server-side.
grant usage on schema public to service_role;

grant select, insert, update, delete on public.profiles, public.properties,
  public.property_images, public.inquiries, public.audit_log, public.site_modules,
  public.site_settings, public.private_settings, public.locations,
  public.property_types, public.appointments, public.inquiry_attachments,
  public.submission_rate_limits, public.media_assets to service_role;

grant usage, select on sequence public.audit_log_id_seq to service_role;
