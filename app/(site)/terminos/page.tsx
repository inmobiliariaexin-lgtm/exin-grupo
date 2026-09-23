import type { Metadata } from 'next'
import Link from 'next/link'
import { getTermsContent } from '@/lib/site-data'

export async function generateMetadata(): Promise<Metadata> {
  const terms = await getTermsContent()
  return { title: terms.title, robots: { index: terms.approved, follow: true } }
}

export default async function TermsPage() {
  const terms = await getTermsContent()
  const blocks = terms.body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)

  return <main className="section narrow-page legal-page">
    <p className="eyebrow dark">INFORMACIÓN LEGAL</p>
    <h1>{terms.title}</h1>
    {!terms.approved && <div className="info-box legal-draft" role="status"><strong>Borrador pendiente de aprobación.</strong> EXIN debe completar los datos de identificación y atención señalados en el panel, y revisar estas condiciones con asesoría jurídica antes de aprobar su versión definitiva.</div>}
    {terms.updatedAt && <p className="legal-version">Versión {terms.version} · Actualizado {new Date(terms.updatedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p>}
    <div className="legal-document">{blocks.map((block, index) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      const heading = lines[0]?.startsWith('# ') ? lines.shift()?.slice(2) : undefined
      if (lines.length && lines.every((line) => line.startsWith('- '))) return <section key={index}>{heading && <h2>{heading}</h2>}<ul>{lines.map((line, itemIndex) => <li key={`${index}-${itemIndex}`}>{line.slice(2)}</li>)}</ul></section>
      return <section key={index}>{heading && <h2>{heading}</h2>}{lines.length > 0 && <p>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{line}</span>)}</p>}</section>
    })}</div>
    <p className="legal-links">También puedes consultar la <Link href="/privacidad">Política de tratamiento de datos personales</Link> o <Link href="/contacto">contactar a EXIN Grupo</Link>.</p>
  </main>
}
