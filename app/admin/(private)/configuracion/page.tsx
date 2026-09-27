import { requireAdminContext } from '@/lib/admin-auth'
import { saveNotificationEmailAction, savePublicContactSettingsAction, sendTestNotificationEmailAction } from '../actions'
import { getPublicSiteSettings } from '@/lib/site-data'
import { getResendApiKey } from '@/lib/resend'

const configured = (name: string) => Boolean(process.env[name]?.trim())

export default async function ConfigurationPage({ searchParams }: { searchParams: Promise<{ error?: string; guardado?: string; contactos?: string; prueba?: string }> }) {
  const [{ supabase }, query] = await Promise.all([requireAdminContext(['superadmin', 'admin']), searchParams])
  const [{ data }, contacts] = await Promise.all([
    supabase.from('private_settings').select('value').eq('setting_key', 'inquiry_notification_email').maybeSingle(),
    getPublicSiteSettings(),
  ])
  const email = data?.value || process.env.INQUIRY_NOTIFICATION_EMAIL || ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const supabaseReady = configured('NEXT_PUBLIC_SUPABASE_URL') && configured('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') && configured('SUPABASE_SECRET_KEY')
  const emailReady = Boolean(getResendApiKey()) && configured('EMAIL_FROM')
  const turnstileReady = configured('NEXT_PUBLIC_TURNSTILE_SITE_KEY') && configured('TURNSTILE_SECRET_KEY')
  const securityReady = configured('LEGAL_CONSENT_VERSION') && (process.env.RATE_LIMIT_HMAC_SECRET?.length ?? 0) >= 32
  const publicFormsReady = supabaseReady && turnstileReady && securityReady

  return <>
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow dark">CONFIGURACIÓN</p>
        <h1>Configuración del sitio</h1>
        <p>Los secretos de integraciones se guardan en el hosting, no en esta página.</p>
      </div>
    </div>
    {query.error && <p className="form-alert">{query.error === 'correo' ? 'Ingresa un correo válido.' : query.error === 'enlace' ? 'Los enlaces sociales deben empezar con https://.' : query.error === 'contacto' ? 'Revisa los teléfonos, correos y enlaces ingresados.' : 'No se pudo guardar la configuración.'}</p>}
    {(query.guardado || query.contactos) && <p className="form-success">Configuración guardada.</p>}
    {query.prueba && <p className={query.prueba === 'aceptado' ? 'form-success' : 'form-alert'} role={query.prueba === 'aceptado' ? 'status' : 'alert'}>{query.prueba === 'aceptado' ? 'Resend aceptó el correo de prueba. Revisa la bandeja de entrada y correo no deseado del destinatario.' : query.prueba === 'sin-destino' ? 'Falta guardar un correo receptor en esta sección o configurar INQUIRY_NOTIFICATION_EMAIL en Cloudflare.' : query.prueba === 'sin-clave' ? 'No está disponible la clave de Resend en este entorno del hosting.' : query.prueba === 'sin-remitente' ? 'Falta configurar EMAIL_FROM en Cloudflare.' : query.prueba === 'rechazado' ? 'Resend rechazó el envío. Revisa la verificación del dominio/remitente y la actividad de la cuenta en Resend.' : 'No se pudo completar el envío de prueba. Revisa la configuración y la actividad en Resend.'}</p>}

    <section className="admin-panel">
      <div className="panel-title"><h2>Contacto público</h2></div>
      <form action={savePublicContactSettingsAction} className="admin-form-grid">
        <label>Teléfono<input name="phone" defaultValue={contacts.phone} maxLength={32} /></label>
        <label>Correo público<input name="email" type="email" defaultValue={contacts.email} maxLength={254} /></label>
        <label>WhatsApp con indicativo<input name="whatsapp" defaultValue={contacts.whatsapp} placeholder="573001234567" maxLength={32} /></label>
        <label>Instagram URL<input name="instagram" type="url" defaultValue={contacts.instagram} maxLength={250} /></label>
        <label>Facebook URL<input name="facebook" type="url" defaultValue={contacts.facebook} maxLength={250} /></label>
        <label>YouTube URL<input name="youtube" type="url" defaultValue={contacts.youtube} maxLength={250} /></label>
        <label>TikTok URL<input name="tiktok" type="url" defaultValue={contacts.tiktok} maxLength={250} /></label>
        <label>LinkedIn URL<input name="linkedin" type="url" defaultValue={contacts.linkedin} maxLength={250} /></label>
        <p className="form-hint wide">Añade las direcciones de tus redes. Solo aparecerán en el pie de página las que tengan un enlace guardado.</p>
        <button className="button">Guardar contacto</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Correo receptor de solicitudes</h2></div>
      <form action={saveNotificationEmailAction} className="admin-form-grid">
        <label className="wide">Correo de notificaciones<input type="email" name="email" defaultValue={email} maxLength={254} placeholder="inmobiliaria.exin@gmail.com" /><small>Si se deja vacío, el sistema usa INQUIRY_NOTIFICATION_EMAIL del hosting.</small></label>
        <button className="button">Guardar correo</button>
      </form>
      <form action={sendTestNotificationEmailAction} className="test-email-form"><button type="submit" className="small-button">Enviar correo de prueba</button><span>Se enviará al destinatario configurado arriba.</span></form>
      <p className="form-hint">El envío requiere la clave de Resend y EMAIL_FROM configurados como secretos y variables de Cloudflare Workers, y un remitente habilitado en Resend. El navegador nunca recibe esas credenciales.</p>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Recuperación e invitaciones del panel</h2></div>
      <p className="form-hint">Estos correos salen por Supabase Auth y su servidor SMTP; son independientes de Resend. El botón de prueba anterior comprueba únicamente las notificaciones de formularios. Si falla una recuperación o invitación, revisa en Supabase: Authentication → SMTP Settings y Authentication → URL Configuration.</p>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Formularios y destino de la información</h2></div>
      <div className="integration-status">
        <p><strong>Recepción:</strong> {publicFormsReady ? 'Las variables necesarias están configuradas para recibir solicitudes.' : 'Los formularios están pausados hasta completar las variables requeridas que aparecen en el estado de integraciones.'}</p>
        <p><strong>Contacto, crédito y captación de inmuebles:</strong> se guardan en Supabase, tabla <code>inquiries</code>. Revísalos en Administración → Solicitudes.</p>
        <p><strong>Agenda de citas:</strong> cada cita queda en <code>appointments</code> y su solicitud relacionada en <code>inquiries</code>. Revísalas en Administración → Citas.</p>
        <p><strong>Fotos de captación:</strong> se almacenan en el bucket privado <code>intake-attachments</code>; sus referencias quedan en <code>inquiry_attachments</code>.</p>
        <p>Los formularios usan validación de datos, consentimiento, control de frecuencia y protección anti-spam. Si una integración requerida no está lista, el envío se detiene y los datos no se descartan en silencio.</p>
      </div>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Estado de integraciones</h2></div>
      <div className="integration-status">
        <p><strong>Hosting:</strong> {siteUrl ? `Cloudflare Workers · ${siteUrl}` : 'Falta configurar NEXT_PUBLIC_SITE_URL en Cloudflare Workers.'}</p>
        <p><strong>Base de datos, Auth y Storage:</strong> {supabaseReady ? 'Supabase tiene sus variables de conexión configuradas en Cloudflare Workers.' : 'Faltan variables de conexión de Supabase en Cloudflare Workers.'}</p>
        <p><strong>Notificaciones:</strong> {emailReady ? 'Hay credenciales de Resend configuradas; confirma que el remitente esté verificado.' : 'Pendiente de la clave de Resend y EMAIL_FROM en Cloudflare Workers.'}</p>
        <p><strong>Protección anti-spam:</strong> {turnstileReady ? 'Hay llaves de Cloudflare Turnstile configuradas.' : 'Pendiente de las llaves pública y privada de Cloudflare Turnstile.'}</p>
        <p><strong>Consentimiento y límite de envíos:</strong> {securityReady ? 'Versión del consentimiento y clave segura de control configuradas.' : 'Falta configurar LEGAL_CONSENT_VERSION o una clave RATE_LIMIT_HMAC_SECRET de al menos 32 caracteres.'}</p>
        <p><strong>Dominio:</strong> {siteUrl ? 'El sitio está configurado para usar el dominio indicado arriba con HTTPS.' : 'Pendiente de configurar el dominio y NEXT_PUBLIC_SITE_URL.'}</p>
      </div>
    </section>
  </>
}
