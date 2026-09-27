'use client'

import { useEffect, useState } from 'react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

type Image = { url: string; alt: string }

export function PropertyGallery({ images, title, whatsapp, code }: { images: Image[]; title: string; whatsapp: string; code: string }) {
  const [active, setActive] = useState<number | null>(null)
  const image = active === null ? null : images[active]
  const contactUrl = (index: number) => getWhatsAppUrl(whatsapp, `Hola, me interesa la fotografía ${index + 1} de ${title} (código ${code}).`)

  useEffect(() => {
    if (active === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null)
      if (event.key === 'ArrowRight') setActive((current) => current === null ? null : (current + 1) % images.length)
      if (event.key === 'ArrowLeft') setActive((current) => current === null ? null : (current - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, images.length])

  return <>
    <section className="property-gallery" aria-label={`Fotografías de ${title}`}>
      <div className="gallery-heading"><div><p className="eyebrow dark">GALERÍA DEL INMUEBLE</p><h2>Explora cada espacio</h2></div><span>{images.length} {images.length === 1 ? 'fotografía' : 'fotografías'}</span></div>
      {images.length ? <div className="gallery-grid">{images.map((item, index) => <article className="gallery-photo" key={`${item.url}-${index}`}><button className="gallery-photo-open" type="button" onClick={() => setActive(index)} aria-label={`Ampliar fotografía ${index + 1}: ${item.alt || title}`}><img src={item.url} alt={item.alt || `${title}, fotografía ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} /><span className="gallery-photo-count">{index + 1} / {images.length} · Ver foto</span></button><div className="gallery-photo-footer"><span>{item.alt || `Fotografía ${index + 1}`}</span>{contactUrl(index) && <a href={contactUrl(index)!} target="_blank" rel="noreferrer">Consultar por WhatsApp ↗</a>}</div></article>)}</div> : <p className="empty-admin">Este inmueble aún no tiene fotografías publicadas.</p>}
    </section>
    {image && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`Fotografía ${active! + 1} de ${images.length}`} onClick={(event) => { if (event.target === event.currentTarget) setActive(null) }}><button className="gallery-close" type="button" onClick={() => setActive(null)} aria-label="Cerrar galería">×</button><button className="gallery-step previous" type="button" onClick={() => setActive((active! - 1 + images.length) % images.length)} aria-label="Fotografía anterior">‹</button><figure><img src={image.url} alt={image.alt || `${title}, fotografía ${active! + 1}`} /><figcaption><span>{active! + 1} de {images.length} · {image.alt || title}</span>{contactUrl(active!) && <a href={contactUrl(active!)!} target="_blank" rel="noreferrer">Consultar esta fotografía por WhatsApp ↗</a>}</figcaption></figure><button className="gallery-step next" type="button" onClick={() => setActive((active! + 1) % images.length)} aria-label="Fotografía siguiente">›</button></div>}
  </>
}
