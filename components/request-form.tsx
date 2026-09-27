'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import Link from 'next/link'
import { useState } from 'react'

type Kind = 'credit' | 'capture' | 'contact' | 'appointment'
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const verificationRequired = Boolean(siteKey) || process.env.NODE_ENV === 'production'

export function RequestForm({ kind, propertyId, propertyCode }: { kind: Kind; propertyId?: string; propertyCode?: string }) {
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [captchaAttempt, setCaptchaAttempt] = useState(0)
  const title = kind === 'capture' ? 'Cuéntanos sobre tu inmueble' : kind === 'credit' ? 'Solicita asesoría de crédito' : kind === 'appointment' ? 'Solicita una cita' : 'Déjanos tu mensaje'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setMessage(''); setMessageError(false)
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
      form.reset(); setTurnstileToken(''); setCaptchaError(false)
      if (kind === 'capture' && photos.length && result.uploadToken) {
        let uploaded = 0
        for (const photo of photos) {
          const uploadForm = new FormData(); uploadForm.set('file', photo)
          const uploadedResponse = await fetch(`/api/inquiries/${result.inquiryId}/attachments`, { method: 'POST', headers: { 'X-EXIN-Upload-Token': result.uploadToken }, body: uploadForm })
          if (uploadedResponse.ok) uploaded++; else break
        }
        setMessage(uploaded === photos.length ? 'Solicitud y fotografías recibidas.' : `La solicitud se recibió. Se cargaron ${uploaded} de ${photos.length} fotografías; contacta al equipo para completar las imágenes.`)
      } else setMessage(result.notificationSent === false ? 'Solicitud guardada. El correo de notificación necesita revisión; el equipo puede verla en Administración → Solicitudes.' : 'Solicitud recibida. El equipo de EXIN podrá darle seguimiento.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error. Intenta nuevamente.')
      setMessageError(true)
    } finally { setBusy(false) }
  }

  const retryCaptcha = () => { setCaptchaError(false); setTurnstileToken(''); setCaptchaAttempt((attempt) => attempt + 1) }

  return <form className="request-card" onSubmit={submit}>
    <p className="eyebrow dark">EXIN GRUPO</p><h2>{title}</h2><p className="form-hint">Completa tus datos y el equipo se pondrá en contacto contigo.</p>
    <div className="fields">
      <label>Nombre completo<input name="fullName" autoComplete="name" maxLength={120} required /></label>
      <label>Teléfono<input name="phone" type="tel" autoComplete="tel" maxLength={32} required /></label>
      <label className="wide">Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      {kind === 'credit' && <label className="wide">Interés<select name="interest" required><option value="">Selecciona una opción</option><option>Crédito hipotecario</option><option>Leasing habitacional</option><option>Conocer opciones</option></select></label>}
      {kind === 'capture' && <>
        <label>Tipo de inmueble<select name="propertyType" required><option value="">Selecciona</option><option>Apartamento</option><option>Casa</option><option>Lote</option><option>Otro</option></select></label>
        <label>Ciudad<input name="city" required maxLength={80} defaultValue="Bogotá" /></label>
        <label className="wide">Barrio o zona<input name="neighborhood" maxLength={120} /></label>
        <label className="wide">Información sobre el inmueble<textarea name="message" rows={3} maxLength={2000} /></label>
        <label className="wide">Fotografías (opcional)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple /><small>Hasta 6 imágenes de máximo 3 MB cada una.</small></label>
      </>}
      {kind === 'appointment' && <>
        <label>Tipo de cita<select name="appointmentType" required><option value="">Selecciona</option><option>Visita a inmueble</option><option>Asesoría de crédito</option><option>Conversación comercial</option></select></label>
        <label>Fecha preferida<input name="appointmentDate" type="date" min={new Date().toLocaleDateString('en-CA')} required /></label>
        <label>Hora preferida<input name="appointmentTime" type="time" required /></label>
      </>}
    </div>
    {(kind === 'contact' || kind === 'appointment') && <label className="field-label">Mensaje<textarea name="message" rows={4} maxLength={2000} required /></label>}
    <label className="consent"><input name="consent" type="checkbox" required /><span>Acepto el tratamiento de mis datos para atender esta solicitud. Consulta la <Link href="/privacidad">Política de tratamiento de datos</Link> y los <Link href="/terminos">Términos y condiciones de uso</Link>.</span></label>
    <div className="honeypot" aria-hidden="true"><label>No completar<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
    {siteKey && <div className="captcha-area"><Turnstile key={captchaAttempt} siteKey={siteKey} onSuccess={(token) => { setTurnstileToken(token); setCaptchaError(false) }} onExpire={() => { setTurnstileToken(''); setMessage('La verificación venció. Vuelve a completarla para enviar.'); setMessageError(true) }} onError={() => { setTurnstileToken(''); setCaptchaError(true); setMessage('No cargó la verificación. Revisa tu conexión y vuelve a intentarlo.'); setMessageError(true) }} options={{ theme: 'light', retry: 'auto', refreshExpired: 'auto', language: 'es' }} />{captchaError && <button className="captcha-retry" type="button" onClick={retryCaptcha}>Reintentar verificación</button>}</div>}
    {verificationRequired && !siteKey && <p className="captcha-notice" role="alert">El formulario está en pausa porque falta configurar la verificación de seguridad. Escríbenos por WhatsApp o teléfono.</p>}
    <button className="button" type="submit" disabled={busy || (verificationRequired && !turnstileToken)}>{busy ? 'Enviando…' : 'Enviar solicitud'} <span>→</span></button>
    <p className={`form-status${messageError ? ' is-error' : ''}`} role={messageError ? 'alert' : 'status'} aria-live="polite">{message}</p>
  </form>
}
