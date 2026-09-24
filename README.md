# EXIN Grupo · Portal inmobiliario

Aplicación web Next.js basada en la interfaz y en los requisitos de los documentos maestros. Incluye el catálogo público, búsqueda, fichas de inmuebles, formularios, solicitud de citas y un panel privado para propiedades, imágenes, contactos, contenido, usuarios y seguimiento comercial.

El proyecto se publica como **Next.js en Cloudflare Workers (OpenNext) + Supabase**. La vista previa usa `exin-grupo-preview.daffy-group.workers.dev`; el dominio principal debe vincularse antes de considerar completa la migración. Resend entrega correos de notificación y Cloudflare Turnstile protege los formularios.

## Abrir en Visual Studio Code

1. Instala Node.js 22 LTS (el mínimo requerido por Next.js es 20.9).
2. Abre esta carpeta en Visual Studio Code.
3. En la terminal integrada ejecuta `npm install`.
4. Copia `.env.example` a `.env.local` y completa los valores locales.
5. Ejecuta `npm run dev` y abre `http://localhost:3000`.

`npm install` genera `package-lock.json`; consérvalo y súbelo junto al código para que las instalaciones y compilaciones del hosting usen las mismas versiones.

Visual Studio Code es el editor recomendado. El proyecto también se puede abrir como carpeta en Visual Studio con soporte para JavaScript/TypeScript, aunque no es una solución .NET.

## Servicios que conecta

| Servicio | Función | Configuración pendiente |
| --- | --- | --- |
| Cloudflare Workers | Hosting y compilación de la aplicación | `workers.dev` está activo; falta vincular el dominio principal |
| Supabase | PostgreSQL, inicio de sesión, imágenes y archivos privados | Crear el proyecto y aplicar migraciones |
| Resend | Avisos de solicitudes y confirmación de citas | Verificar dominio de envío y cargar API key |
| Cloudflare Turnstile | Protección contra envíos automatizados | Crear widget para los dominios de producción y vista previa |

## Conectar Supabase

1. Crea un proyecto Supabase y guarda la URL, el **publishable key** y el **secret key** en un gestor seguro.
2. Instala la [CLI oficial de Supabase](https://supabase.com/docs/guides/cli) e inicia sesión con `supabase login`.
3. Desde esta carpeta enlaza el proyecto con `supabase link --project-ref TU_PROJECT_REF`.
4. Revisa los cambios con `npm run db:push:dry`; cuando el proyecto Supabase seleccionado sea el correcto, aplica con `npm run db:push`.
5. En **Authentication → URL Configuration**, configura la URL pública final y las URLs de retorno de producción, `*.vercel.app` y localhost para desarrollo.
6. En **Authentication → SMTP Settings**, conecta un proveedor SMTP verificado antes de invitar usuarios.
7. Crea el primer usuario desde Supabase Auth. Luego, en el SQL Editor de ese mismo proyecto, promuévelo a superadmin:

   ```sql
   update public.profiles p
   set role = 'superadmin', active = true
   from auth.users u
   where p.id = u.id and lower(u.email) = lower('CORREO-DEL-ADMIN');
   ```

   El proyecto no habilita el registro público. El superadmin invita personal desde `/admin/usuarios`. El invitado recibe un enlace de Supabase Auth que abre `/admin/nueva-contrasena`; allí crea y confirma su contraseña (10–128 caracteres) y luego inicia sesión. Antes de invitar, configura SMTP y permite la URL de vista previa o del dominio final en **Authentication → URL Configuration**.

La migración inicial crea las tablas, permisos RLS, buckets públicos de imágenes, bucket privado de captaciones, límites de archivos y funciones para formularios. Las propiedades reales no se cargan automáticamente: deben ingresarse y aprobarse desde el panel.

## Variables de entorno

Configura en `.env.local` para desarrollo. Para Cloudflare Workers, guarda las variables públicas en `wrangler.jsonc` y añade los secretos en **Workers & Pages → exin-grupo-preview → Settings → Variables and Secrets**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (solo servidor; nunca añadir el prefijo `NEXT_PUBLIC_`)
- `RATE_LIMIT_HMAC_SECRET` (mínimo 32 caracteres aleatorios)
- `NEXT_PUBLIC_SITE_URL` (URL canónica HTTPS de producción)
- `LEGAL_CONSENT_VERSION` (versión del aviso aprobada por EXIN)
- `EXIN_RESEND_API_KEY` (or `RESEND_API_KEY`), `EMAIL_FROM`, `INQUIRY_NOTIFICATION_EMAIL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

`SUPABASE_SECRET_KEY`, `RATE_LIMIT_HMAC_SECRET`, `EXIN_RESEND_API_KEY` y `TURNSTILE_SECRET_KEY` son secretos: nunca deben añadirse a GitHub ni a `wrangler.jsonc`. Las variables `NEXT_PUBLIC_*` se necesitan al compilar el cliente. Añade el hostname de producción y el de vista previa a Turnstile.

## Desplegar en Cloudflare Workers

1. Clona el repositorio GitHub y ejecuta `npm install`.
2. Ejecuta `wrangler login` con una cuenta autorizada para desplegar el Worker.
3. Define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en el entorno de compilación.
4. Ejecuta `npm run deploy:cloudflare-preview`. El comando genera `.open-next/` y publica el Worker descrito en `wrangler.jsonc`.
5. Confirma en Cloudflare que los secretos de Supabase, Resend, Turnstile y límites de solicitudes estén guardados para Producción.
6. Añade el dominio a Cloudflare Workers y completa los cambios DNS necesarios antes de publicar el dominio principal.
7. Aplica las migraciones de Supabase, configura SMTP, crea el superadmin, carga los inmuebles reales y revisa los textos legales antes de habilitar captación pública.

## Rutas implementadas

- Sitio público: `/`, `/propiedades`, `/propiedades/[slug]`, `/vender`, `/credito`, `/nosotros`, `/contacto`, `/aliados`, `/agendar` y `/privacidad`.
- Administración protegida: `/admin/login`, `/admin`, `/admin/propiedades`, `/admin/leads`, `/admin/citas`, `/admin/contenido`, `/admin/ubicaciones`, `/admin/usuarios` y `/admin/configuracion`.
- El módulo de arriendos y el de constructora empiezan desactivados. No hay listados inmobiliarios ficticios en el catálogo conectado.
- `prototipo-estatico/` conserva la maqueta anterior para referencia visual; no es el sitio de producción ni debe publicarse como reemplazo de la aplicación Next.js.

## Requisitos antes de producción

El documento complementario es una base funcional reconstruida y pide revisión antes de contratar o publicar. EXIN debe confirmar los textos legales, roles finales, políticas comerciales, datos reales, cuentas proveedoras y dominio. La página de privacidad y el consentimiento todavía requieren aprobación jurídica. No se debe recoger información real hasta configurar esos textos y los secretos del entorno.

Documentación oficial: [Cloudflare Workers](https://developers.cloudflare.com/workers/), [OpenNext](https://opennext.js.org/cloudflare), [Supabase](https://supabase.com/docs), [Resend](https://resend.com/docs) y [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
