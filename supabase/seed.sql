-- Development defaults only. The database starts without users or live listings.
insert into public.locations (country, department, city, zone, sort_order)
select 'Colombia', 'Bogotá D.C.', 'Bogotá', null, 0
where not exists (select 1 from public.locations where country = 'Colombia' and city = 'Bogotá');

insert into public.site_modules (module_key, content, enabled, sort_order)
values ('home', '{"hero_title":"Encuentra tu próximo inmueble","hero_subtitle":"EXIN Grupo te acompaña para encontrar y financiar tu próximo hogar.","hero_image":"/assets/hero-referencia.jpg","credit_title":"Tu próximo hogar puede estar más cerca.","seller_title":"Tu propiedad merece llegar a más personas."}'::jsonb, true, 0)
on conflict (module_key) do nothing;

insert into public.site_modules (module_key, content, enabled, sort_order)
values
  ('featured_properties', '{}'::jsonb, true, 10),
  ('credit', '{}'::jsonb, true, 20),
  ('seller', '{}'::jsonb, true, 30),
  ('allies', '{}'::jsonb, true, 40),
  ('constructor', '{}'::jsonb, false, 50),
  ('rent', '{}'::jsonb, false, 60)
on conflict (module_key) do nothing;

insert into public.property_types (name, sort_order)
values ('Apartamento', 0), ('Casa', 1), ('Lote', 2)
on conflict (name) do nothing;
