'use client'
import { Turnstile } from '@marsidev/react-turnstile'
import { useState } from 'react'

type Kind = 'credit' | 'capture' | 'contact' | 'appointment'
export function RequestForm({ kind, propertyId, propertyCode }: { kind: Kind; propertyId?: string; propertyCode?: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const title = kind === 'capture' ? 'Cuéntanos sobre tu inmueble' : kind === 'credit' ? 'Solicita asesoría de crédito' : kind === 'appointment' ? 'Solicita una cita' : 'Déjanos tu mensaje'
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = Object.fromEntries([...formData.entries()].filter(([, value]) => typeof value === 'string'))
    payload.kind = kind
    payload.propertyId = propertyId ?? ''
    payload.propertyCode = propertyCode ?? ''
    payload.turnstileToken = turnstileToken
    const photos = formData.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0)
    if (kind === 'capture') payload.attachmentCount = String(photos.length)
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar la solicitud.')
      form.reset(); setTurnstileToken('')
      if (kind === 'capture' && photos.length && result.uploadToken) {
        let uploaded = 0
        for (const photo of photos) { const uploadForm = new FormData(); uploadForm.set('file',photo); const uploadedResponse = await fetch(`/api/inquiries/${result.inquiryId}/attachments`,{method:'POST',headers:{'X-EXIN-Upload-Token':result.uploadToken},body:uploadForm}); if (uploadedResponse.ok) uploaded++; else break }
        setMessage(uploaded === photos.length ? 'Solicitud y fotografías recibidas.' : `La solicitud se recibió. Se cargaron ${uploaded} de ${photos.length} fotografías; contacta al equipo para completar las imágenes.`)
      } else setMessage(result.notificationSent === false ? 'Solicitud recibida. La notificación interna requiere configuración.' : 'Solicitud recibida. El equipo de EXIN podrá darle seguimiento.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ocurrió un error. Intenta nuevamente.') }
    finally { setBusy(false) }
  }
  return <form className="request-card" onSubmit={submit}><p className="eyebrow dark">EXIN GRUPO</p><h2>{title}</h2><p className="form-hint">Completa tus datos y el equipo se pondrá en contacto contigo.</p><div className="fields"><label>Nombre completo<input name="fullName" autoComplete="name" maxLength={120} required /></label><label>Teléfono<input name="phone" type="tel" autoComplete="tel" maxLength={32} required /></label><label className="wide">Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>{kind === 'credit' && <label className="wide">Interés<select name="interest" required><option value="">Selecciona una opción</option><option>Crédito hipotecario</option><option>Leasing habitacional</option><option>Conocer opciones</option></select></label>}{kind === 'capture' && <><label>Tipo de inmueble<select name="propertyType" required><option value="">Selecciona</option><option>Apartamento</option><option>Casa</option><option>Lote</option><option>Otro</option></select></label><label>Ciudad<input name="city" required maxLength={80} defaultValue="Bogotá" /></label><label className="wide">Barrio o zona<input name="neighborhood" maxLength={120} /></label><label className="wide">Información sobre el inmueble<textarea name="message" rows={3} maxLength={2000} /></label><label className="wide">Fotografías (opcional)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple /><small>Hasta 6 imágenes de máximo 3 MB cada una.</small></label></>}{kind === 'appointment' && <><label>Tipo de cita<select name="appointmentType" required><option value="">Selecciona</option><option>Visita a inmueble</option><option>Asesoría de crédito</option><option>Conversación comercial</option></select></label><label>Fecha preferida<input name="appointmentDate" type="date" min={new Date().toLocaleDateString('en-CA')} required /></label><label>Hora preferida<input name="appointmentTime" type="time" required /></label></>}</div>{(kind === 'contact' || kind === 'appointment') && <label className="field-label">Mensaje<textarea name="message" rows={4} maxLength={2000} required /></label>}<label className="consent"><input name="consent" type="checkbox" required /><span>Acepto el tratamiento de mis datos para atender esta solicitud. Consulta la <a href="/privacidad">política de privacidad</a>. El texto legal definitivo debe ser aprobado por EXIN.</span></label><div className="honeypot" aria-hidden="true"><label>No completar<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} options={{ theme: 'light' }} />}<button className="button" type="submit" disabled={busy || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !turnstileToken)}>{busy ? 'Enviando…' : 'Enviar solicitud'} <span>→</span></button><p className="form-status" role="status" aria-live="polite">{message}</p></form>
}
