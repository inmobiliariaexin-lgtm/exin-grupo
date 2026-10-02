import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Aliados', description: 'Aliados comerciales de EXIN Grupo.' }
export default async function AlliesPage() { const content = await getHomeContent(); if (content.modules?.allies === false) notFound(); return <main className="section narrow-page"><p className="eyebrow dark">{content.allies_eyebrow}</p><h1>{content.allies_page_title}</h1><p>{content.allies_page_intro}</p><div className="ally-strip standalone"><img src="/assets/logo-habi.png" alt="Habi" /><div><strong>Habi</strong><p>Aliado comercial de EXIN Grupo.</p></div></div><p>{content.allies_page_detail}</p><Link className="button" href="/aliados/habi/propiedades">Ver propiedades disponibles de Habi <span>→</span></Link></main> }
