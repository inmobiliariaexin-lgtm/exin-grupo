import type { Metadata } from 'next'
import Link from 'next/link'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Nosotros', description: 'Conoce el equipo de EXIN Grupo.' }
export default async function AboutPage() { const content = await getHomeContent(); return <main className="section narrow-page"><p className="eyebrow dark">{content.about_eyebrow}</p><h1>{content.about_title}</h1><p>{content.about_intro}</p><p>{content.about_details}</p><Link className="button" href="/contacto">{content.about_button}</Link></main> }
