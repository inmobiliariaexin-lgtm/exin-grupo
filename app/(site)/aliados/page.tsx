import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Aliados', description: 'Aliados comerciales de EXIN Grupo.' }
export default async function AlliesPage() { const content = await getHomeContent(); if (content.modules?.allies === false) notFound(); return <main className="section narrow-page"><p className="eyebrow dark">RELACIONES COMERCIALES</p><h1>Aliados de EXIN Grupo</h1><p>EXIN Grupo mantiene una relación comercial con Habi. Esta referencia es informativa y no convierte a Habi en la marca principal del portal.</p><div className="ally-strip standalone"><img src="/assets/logo-habi.png" alt="Habi" /><div><strong>Habi</strong><p>Aliado comercial de EXIN Grupo.</p></div></div><p>La descripción y los logotipos de aliados deben contar con autorización y seguir los lineamientos de marca correspondientes.</p></main> }
