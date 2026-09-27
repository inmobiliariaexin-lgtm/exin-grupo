'use client'
import { useEffect, useState } from 'react'
type Asset = { id: string; public_url: string; file_name: string; alt_text: string; content_type: string; created_at: string }
export function MediaLibrary({ canDelete = false }: { canDelete?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([]), [busy,setBusy] = useState(false), [notice,setNotice] = useState('')
  async function load() { const response = await fetch('/api/admin/media', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar la biblioteca.'); return (data.assets ?? []) as Asset[] }
  useEffect(() => { let active = true; void load().then((items) => { if (active) setAssets(items) }).catch((error: unknown) => { if (active) setNotice(error instanceof Error ? error.message : 'No se pudo cargar la biblioteca.') }); return () => { active = false } }, [])
  async function upload(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setNotice(''); const form = event.currentTarget; const response = await fetch('/api/admin/media', { method:'POST', body:new FormData(form) }); const data = await response.json(); if (!response.ok) setNotice(data.error || 'No se pudo subir la imagen.'); else { setNotice('Imagen guardada en Supabase Storage.'); form.reset(); await load() } setBusy(false) }
  async function copy(url: string) { await navigator.clipboard.writeText(url); setNotice('Enlace copiado. Pégalo en el campo de imagen correspondiente.') }
  async function remove(asset: Asset) {
    const phrase = window.prompt(`Se borrará ${asset.file_name} de la biblioteca y del almacenamiento. Si esta imagen está puesta en una página, dejará de verse.\n\nPara confirmar, escribe ELIMINAR.`)
    if (phrase?.trim().toUpperCase() !== 'ELIMINAR') return
    setBusy(true); setNotice('')
    const response = await fetch(`/api/admin/media?id=${encodeURIComponent(asset.id)}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) setNotice(data.error || 'No se pudo eliminar la imagen.')
    else { setNotice(data.cleanupPending ? 'Imagen borrada; el archivo quedó pendiente de limpieza.' : 'Imagen y archivo eliminados.'); await load() }
    setBusy(false)
  }
  return <section className="admin-panel"><div className="panel-title"><h2>Biblioteca multimedia</h2><span>Imágenes públicas del sitio</span></div><form className="media-upload-form" onSubmit={upload}><label>Imagen JPG, PNG, WebP o AVIF<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label><label>Texto alternativo<input name="altText" required maxLength={180} placeholder="Describe con precisión lo que muestra la imagen" /></label><button className="button" disabled={busy}>{busy ? 'Subiendo…' : 'Subir imagen'}</button></form>{canDelete && <p className="form-hint">Antes de borrar una imagen, quita su URL del contenido del sitio. Si está en uso, dejará de mostrarse.</p>}{notice && <p className="form-status" role="status">{notice}</p>}<div className="media-grid">{assets.map((asset) => <article className="media-card" key={asset.id}><img src={asset.public_url} alt={asset.alt_text} /><strong>{asset.file_name}</strong><small>{asset.alt_text}</small><button type="button" className="small-button" disabled={busy} onClick={() => copy(asset.public_url)}>Copiar URL</button>{canDelete && <button type="button" className="delete-button" disabled={busy} onClick={() => remove(asset)}>Eliminar imagen</button>}</article>)}</div></section>
}
