'use client'

import { useEffect, useState } from 'react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

type Image = { url: string; alt: string }

export function PropertyGallery({ images, title, whatsapp, code }: { images: Image[]; title: string; whatsapp: string; code: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const image = active === null ? null : images[active]
  const contactUrl = (index: number) => getWhatsAppUrl(whatsapp, `Hola, me interesa la fotografía ${index + 1} de ${title} (código ${code}).`)
  const step = (direction: number) => setCurrentIndex((current) => (current + direction + images.length) % images.length)

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
      {images.length ? <div className="gallery-carousel">
        {images.length > 1 && <button className="gallery-carousel-step previous" type="button" onClick={() => step(-1)} aria-label="Fotografía anterior">‹</button>}
        <button className="gallery-carousel-image" type="button" onClick={() => setActive(currentIndex)} aria-label={`Ampliar fotografía ${currentIndex + 1}: ${images[currentIndex].alt || title}`}>
          <img src={images[currentIndex].url} alt={images[currentIndex].alt || `${title}, fotografía ${currentIndex + 1}`} />
          <span className="gallery-photo-count">{currentIndex + 1} / {images.length} · Ver foto</span>
        </button>
        {images.length > 1 && <button className="gallery-carousel-step next" type="button" onClick={() => step(1)} aria-label="Fotografía siguiente">›</button>}
        <div className="gallery-photo-footer"><span>{images[currentIndex].alt || `Fotografía ${currentIndex + 1}`}</span>{contactUrl(currentIndex) && <a href={contactUrl(currentIndex)!} target="_blank" rel="noreferrer">Consultar por WhatsApp ↗</a>}</div>
      </div> : <p className="empty-admin">Este inmueble aún no tiene fotografías publicadas.</p>}
    </section>
    {image && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`Fotografía ${active! + 1} de ${images.length}`} onClick={(event) => { if (event.target === event.currentTarget) setActive(null) }}><button className="gallery-close" type="button" onClick={() => setActive(null)} aria-label="Cerrar galería">×</button><button className="gallery-step previous" type="button" onClick={() => setActive((active! - 1 + images.length) % images.length)} aria-label="Fotografía anterior">‹</button><figure><img src={image.url} alt={image.alt || `${title}, fotografía ${active! + 1}`} /><figcaption><span>{active! + 1} de {images.length} · {image.alt || title}</span>{contactUrl(active!) && <a href={contactUrl(active!)!} target="_blank" rel="noreferrer">Consultar esta fotografía por WhatsApp ↗</a>}</figcaption></figure><button className="gallery-step next" type="button" onClick={() => setActive((active! + 1) % images.length)} aria-label="Fotografía siguiente">›</button></div>}
  </>
}
