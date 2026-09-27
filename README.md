# EXIN Grupo · Portal inmobiliario

Aplicación web Next.js basada en la interfaz y en los requisitos de los documentos maestros. Incluye el catálogo público, búsqueda, fichas de inmuebles, formularios, solicitud de citas y un panel privado para propiedades, imágenes, contactos, contenido, usuarios y seguimiento comercial.

El proyecto se publica como **Next.js en Cloudflare Workers (OpenNext) + Supabase**. La producción está conectada a `https://inmobiliariagrupoexin.com` y `https://www.inmobiliariagrupoexin.com`; la vista previa usa `exin-grupo-preview.daffy-group.workers.dev`. Resend entrega avisos de solicitudes y Cloudflare Turnstile protege los formularios.

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
| Cloudflare Workers | Hosting y compilación de la aplicación | Producción activa con dominio propio; la URL `workers.dev` queda como vista previa |
| Supabase | PostgreSQL, inicio de sesión, imágenes y archivos privados | Proyecto existente conectado; conservarlo al migrar y proteger sus claves |
| Resend | Avisos de solicitudes y confirmación de citas | Clave cargada en Cloudflare; falta hacer un envío de prueba desde el formulario y confirmar entrega |
| Cloudflare Turnstile | Protección contra envíos automatizados | Widget existente acepta el dominio principal y la URL de vista previa |

## Supabase y recuperación de acceso

El proyecto Supabase `exin-grupo` ya está conectado y **Site URL** y la URL de retorno de `https://inmobiliariagrupoexin.com` están configuradas. Conserva ese mismo proyecto al migrar; no crees otro ni vuelvas a aplicar migraciones sin revisar antes el estado de producción.

Para administrar migraciones futuras, instala la [CLI oficial de Supabase](https://supabase.com/docs/guides/cli), inicia sesión con `supabase login`, enlaza el proyecto con `supabase link --project-ref rqczwbyetuvehjdtetqt` y revisa siempre los cambios con `npm run db:push:dry` antes de aplicar `npm run db:push`.

En **Authentication → SMTP Settings**, mantén un proveedor SMTP verificado para invitaciones y recuperación de contraseña. El acceso administrativo utiliza cuentas individuales; no hay registro público. El superadmin invita personal desde `/admin/usuarios`. Los invitados crean su contraseña en `/admin/nueva-contrasena`.

Si hay que preparar una instalación desde cero, crea el usuario inicial en Supabase Auth y, en el SQL Editor de ese mismo proyecto, promuévelo a superadmin:

   ```sql
   update public.profiles p
   set role = 'superadmin', active = true
   from auth.users u
   where p.id = u.id and lower(u.email) = lower('CORREO-DEL-ADMIN');
   ```

   El proyecto no habilita el registro público. El superadmin invita personal desde `/admin/usuarios`. El invitado recibe un enlace de Supabase Auth que abre `/admin/nueva-contrasena`; allí crea y confirma su contraseña (10–128 caracteres) y luego inicia sesión. Antes de invitar, configura SMTP y permite la URL de vista previa o del dominio final en **Authentication → URL Configuration**.

La migración inicial crea las tablas, permisos RLS, buckets públicos de imágenes, bucket privado de captaciones, límites de archivos y funciones para formularios. Las propiedades reales no se cargan automáticamente: deben ingresarse y aprobarse desde el panel.

## Cargar fotografías de inmuebles

1. Entra a `https://inmobiliariagrupoexin.com/admin/login` con una cuenta activa de administrador.
2. Abre **Propiedades** y registra el inmueble. Pulsa **Guardar inmueble**.
3. Busca el registro en **Inmuebles recientes** y pulsa **Cargar fotos**.
4. Selecciona una imagen JPG, PNG, WebP o AVIF de máximo 3 MB y agrega un texto alternativo que describa la foto. Se admiten hasta 30 imágenes por inmueble.
5. La primera imagen queda como portada. En la galería puedes seleccionar otra portada, cambiar el orden o retirar una imagen.
6. Cambia el estado a **Publicada** cuando la ficha y sus fotos estén listas. Las imágenes de la galería son públicas y se mostrarán en el catálogo.

Para imágenes de la portada, fondos y otros contenidos del sitio, abre **Administración → Contenido → Biblioteca multimedia**. Esa biblioteca general no reemplaza la galería propia de cada inmueble.

## Variables de entorno

Configura en `.env.local` para desarrollo. Para producción, administra las variables y secretos en **Workers & Pages → exin-grupo-preview → Settings → Variables and Secrets**. El dominio canónico ya está configurado en `wrangler.jsonc`:

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

1. Clona el repositorio GitHub, usa la rama `cloudflare-preview` y ejecuta `npm install`.
2. Ejecuta `wrangler login` con una cuenta autorizada para desplegar el Worker.
3. Define las variables públicas de Supabase y Turnstile en `wrangler.jsonc`; `NEXT_PUBLIC_SITE_URL` debe ser `https://inmobiliariagrupoexin.com`.
4. Ejecuta `npm run deploy:cloudflare-preview`. El comando genera `.open-next/` y publica el Worker descrito en `wrangler.jsonc`.
5. Confirma en Cloudflare que los secretos de Supabase, Resend, Turnstile y límites de solicitudes estén guardados para Producción.
6. Verifica en la sección Dominios que `inmobiliariagrupoexin.com` y `www.inmobiliariagrupoexin.com` estén conectados al Worker.
7. Antes de una nueva migración, revisa las migraciones de Supabase, SMTP, el correo de prueba y los textos legales. Después carga los inmuebles reales y los datos públicos de contacto desde el panel.

## Rutas implementadas

- Sitio público: `/`, `/propiedades`, `/propiedades/[slug]`, `/vender`, `/credito`, `/nosotros`, `/contacto`, `/aliados`, `/agendar` y `/privacidad`.
- Administración protegida: `/admin/login`, `/admin`, `/admin/propiedades`, `/admin/propiedades/[id]/editar`, `/admin/propiedades/[id]/imagenes`, `/admin/leads`, `/admin/citas`, `/admin/contenido`, `/admin/ubicaciones`, `/admin/usuarios` y `/admin/configuracion`.
- El módulo de arriendos y el de constructora empiezan desactivados. No hay listados inmobiliarios ficticios en el catálogo conectado.
- `prototipo-estatico/` conserva la maqueta anterior para referencia visual; no es el sitio de producción ni debe publicarse como reemplazo de la aplicación Next.js.

## Pendientes de contenido y revisión

El contenido del catálogo aún requiere inmuebles reales publicados. Desde **Administración → Configuración** se deben completar los teléfonos y WhatsApp. Los textos de privacidad, consentimiento y términos necesitan aprobación de EXIN y revisión jurídica. Conviene enviar una solicitud de prueba con datos ficticios y confirmar que queda guardada en **Administración → Solicitudes** y que llega a `inmobiliaria.exin@gmail.com` antes de promocionar la captación.

Los comandos `npm run preview:cloudflare` y `npm run deploy:cloudflare-preview` cargan las variables `NEXT_PUBLIC_*` declaradas en `wrangler.jsonc` durante la compilación. Esto es necesario porque Next.js incorpora estas llaves públicas al JavaScript del navegador en el momento de compilar.

Documentación oficial: [Cloudflare Workers](https://developers.cloudflare.com/workers/), [OpenNext](https://opennext.js.org/cloudflare), [Supabase](https://supabase.com/docs), [Resend](https://resend.com/docs) y [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
