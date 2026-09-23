# EXIN Grupo · Portal inmobiliario

Aplicación web Next.js basada en la interfaz y en los requisitos de los documentos maestros. Incluye el catálogo público, búsqueda, fichas de inmuebles, formularios, solicitud de citas y un panel privado para propiedades, imágenes, contactos, contenido, usuarios y seguimiento comercial.

El proyecto está preparado para **Vercel + Supabase**. Resend entrega correos de notificación y Cloudflare Turnstile protege los formularios. El código de integración está incluido; las cuentas, credenciales, dominio y contenidos aprobados de EXIN todavía deben conectarse para que opere en producción.

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
| Vercel | Hosting, compilación y dominios HTTPS | Crear el proyecto y asignar el dominio EXIN |
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

   El proyecto no habilita el registro público. El superadmin podrá invitar personal desde `/admin/usuarios`.

La migración inicial crea las tablas, permisos RLS, buckets públicos de imágenes, bucket privado de captaciones, límites de archivos y funciones para formularios. Las propiedades reales no se cargan automáticamente: deben ingresarse y aprobarse desde el panel.

## Variables de entorno

Configura en `.env.local` para desarrollo y en **Vercel → Project → Settings → Environment Variables** para producción y vistas previas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (solo servidor; nunca añadir el prefijo `NEXT_PUBLIC_`)
- `RATE_LIMIT_HMAC_SECRET` (mínimo 32 caracteres aleatorios)
- `NEXT_PUBLIC_SITE_URL` (URL canónica HTTPS de producción)
- `LEGAL_CONSENT_VERSION` (versión del aviso aprobada por EXIN)
- `RESEND_API_KEY`, `EMAIL_FROM`, `INQUIRY_NOTIFICATION_EMAIL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

Los valores de Resend y Turnstile no deben publicarse. Añade el dominio de producción y los dominios de vista previa de Vercel a la configuración del widget Turnstile. Vercel proporciona `VERCEL_URL` automáticamente para validar formularios en vistas previas.

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio Git privado y crea un proyecto Vercel desde ese repositorio.
2. Selecciona Next.js (detección automática), define las variables de entorno y asigna el dominio EXIN en **Settings → Domains**.
3. Apunta los registros DNS que indique Vercel. Vercel gestiona el certificado HTTPS del dominio.
4. Aplica las migraciones de Supabase antes de habilitar formularios o invitar al equipo.
5. Agrega en Resend el registro DNS de envío (SPF/DKIM) que indique la cuenta y actualiza `EMAIL_FROM`.
6. Configura Turnstile para el dominio real, carga ambas claves y actualiza `LEGAL_CONSENT_VERSION` solo con el texto aprobado.
7. Crea el primer superadmin y carga únicamente propiedades, contactos e imágenes autorizados por EXIN.

## Rutas implementadas

- Sitio público: `/`, `/propiedades`, `/propiedades/[slug]`, `/vender`, `/credito`, `/nosotros`, `/contacto`, `/aliados`, `/agendar` y `/privacidad`.
- Administración protegida: `/admin/login`, `/admin`, `/admin/propiedades`, `/admin/leads`, `/admin/citas`, `/admin/contenido`, `/admin/ubicaciones`, `/admin/usuarios` y `/admin/configuracion`.
- El módulo de arriendos y el de constructora empiezan desactivados. No hay listados inmobiliarios ficticios en el catálogo conectado.
- `prototipo-estatico/` conserva la maqueta anterior para referencia visual; no es el sitio de producción ni debe publicarse como reemplazo de la aplicación Next.js.

## Requisitos antes de producción

El documento complementario es una base funcional reconstruida y pide revisión antes de contratar o publicar. EXIN debe confirmar los textos legales, roles finales, políticas comerciales, datos reales, cuentas proveedoras y dominio. La página de privacidad y el consentimiento todavía requieren aprobación jurídica. No se debe recoger información real hasta configurar esos textos y los secretos del entorno.

Documentación oficial: [Vercel](https://vercel.com/docs), [Supabase](https://supabase.com/docs), [Resend](https://resend.com/docs) y [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
