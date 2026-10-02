import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Vender tu inmueble', description: 'Conoce cómo EXIN Grupo puede acompañarte para comercializar tu inmueble.' }
export default async function SellPage() { const content = await getHomeContent(); if (content.modules?.seller === false) notFound(); return <main className="section page-grid"><div className="page-copy"><p className="eyebrow dark">{content.sell_eyebrow}</p><h1>{content.sell_page_title}</h1><p>{content.sell_intro}</p><ul>{content.sell_benefits.split('\n').filter(Boolean).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul><p className="pending-note">{content.sell_note}</p></div><RequestForm kind="capture" /></main> }
