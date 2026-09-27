insert into public.site_modules (module_key, content, enabled, sort_order)
values
  ('featured_properties', '{}'::jsonb, true, 10),
  ('credit', '{}'::jsonb, true, 20),
  ('seller', '{}'::jsonb, true, 30),
  ('allies', '{}'::jsonb, true, 40),
  ('constructor', '{}'::jsonb, false, 50),
  ('rent', '{}'::jsonb, false, 60),
  ('project_cta', '{}'::jsonb, false, 70)
on conflict (module_key) do nothing;
