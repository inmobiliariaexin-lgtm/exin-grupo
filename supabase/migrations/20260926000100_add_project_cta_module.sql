insert into public.site_modules (module_key, content, enabled, sort_order)
values ('project_cta', '{}'::jsonb, false, 70)
on conflict (module_key) do nothing;
