import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Vender tu inmueble', description: 'Conoce cómo EXIN Grupo puede acompañarte para comercializar tu inmueble.' }
export default async function SellPage() { const content = await getHomeContent(); if (content.modules?.seller === false) notFound(); return <main className="section page-grid"><div className="page-copy"><p className="eyebrow dark">VENDE CON EXIN GRUPO</p><h1>Conversemos sobre tu inmueble.</h1><p>Déjanos tus datos y una primera descripción. Un integrante del equipo se pondrá en contacto para conocer los detalles.</p><ul><li>Acompañamiento durante el proceso de comercialización</li><li>Información clara sobre los siguientes pasos</li><li>Contacto directo con el equipo de EXIN</li></ul><p className="pending-note">El proceso comercial y los tiempos de atención deben ser definidos por EXIN antes del lanzamiento.</p></div><RequestForm kind="capture" /></main> }
