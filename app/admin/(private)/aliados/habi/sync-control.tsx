'use client'

import { useState } from 'react'
import { advanceHabiCatalogSyncAction, startHabiCatalogSyncAction } from '@/app/admin/(private)/actions'
import type { HabiSyncError, HabiSyncProgress } from '@/lib/habi-sync'

const errorMessages: Record<HabiSyncError, string> = {
  'not-configured': 'Falta configurar HABI_API_KEY en los secretos del Worker de Cloudflare.',
  'not-owner': 'Esta importación fue iniciada por otro usuario. Inicia una nueva importación con tu cuenta.',
  unauthorized: 'Habi rechazó la llave. Revisa que HABI_API_KEY esté escrita correctamente en Cloudflare.',
  'invalid-request': 'Habi rechazó los parámetros de consulta.',
  unavailable: 'Se interrumpió la conexión con Habi. Los datos anteriores permanecen intactos; puedes volver a intentarlo.',
  'invalid-response': 'Habi devolvió una respuesta incompleta. Los datos anteriores permanecen intactos.',
  'page-limit': 'La consulta superó el límite preventivo de páginas. Los datos anteriores permanecen intactos.',
  'database-error': 'No se pudo guardar la actualización en Supabase. Los datos anteriores permanecen intactos.',
}

type Props = {
  apiKeyConfigured: boolean
  schemaReady: boolean
  resumableRunId: string | null
  resumableReceived: number
  resumablePages: number
}

export function HabiSyncControl({ apiKeyConfigured, schemaReady, resumableRunId, resumableReceived, resumablePages }: Props) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<HabiSyncProgress | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSync() {
    if (busy || !apiKeyConfigured || !schemaReady) return
    setBusy(true)
    setError('')
    setMessage('Preparando la conexión segura con Habi…')

    try {
      let current = resumableRunId
        ? { runId: resumableRunId }
        : await startHabiCatalogSyncAction()

      if (!current.runId || ('status' in current && current.status === 'failed')) {
        const startError = 'error' in current ? current.error : undefined
        setError(startError ? errorMessages[startError] : 'No se pudo iniciar la importación.')
        setMessage('')
        setBusy(false)
        return
      }

      let latest: HabiSyncProgress | null = null
      for (let step = 0; step < 1_000; step += 1) {
        latest = await advanceHabiCatalogSyncAction(current.runId)
        setProgress(latest)
        setMessage(`Importando catálogo: ${latest.received.toLocaleString('es-CO')} recibidos · ${latest.pages} páginas${latest.total !== null ? ` de ${latest.total.toLocaleString('es-CO')} inmuebles` : ''}.`)

        if (latest.status === 'succeeded') {
          window.location.assign(`/admin/aliados/habi?sync=ok&saved=${latest.saved}&received=${latest.received}`)
          return
        }
        if (latest.status === 'failed') {
          setError(latest.error ? errorMessages[latest.error] : 'La importación no se completó.')
          setMessage('')
          setBusy(false)
          return
        }
      }

      setError('La importación sigue pendiente. Recarga esta página para continuar desde el último avance guardado.')
      setMessage('')
      setBusy(false)
    } catch {
      setError('Se interrumpió un paso. El avance guardado se conserva; recarga esta página para continuar.')
      setMessage('')
      setBusy(false)
    }
  }

  return <div>
    {message && <p className="form-hint" role="status" aria-live="polite">{message}</p>}
    {progress?.status === 'running' && <p className="form-hint">El avance se guarda página por página; puedes volver aquí si se interrumpe.</p>}
    {error && <p className="form-alert" role="alert">{error}</p>}
    <button className="button" type="button" onClick={handleSync} disabled={busy || !apiKeyConfigured || !schemaReady}>
      {busy ? 'Importando…' : resumableRunId ? `Continuar importación (${resumableReceived.toLocaleString('es-CO')} registros · ${resumablePages} páginas)` : 'Traer y guardar catálogo completo'}
    </button>
  </div>
}
