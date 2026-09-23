import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { getHomeContent } from '@/lib/site-data'
export const metadata: Metadata = { title: 'Crédito hipotecario', description: 'Solicita orientación para explorar opciones de financiación inmobiliaria.' }
export default async function CreditPage() { const content = await getHomeContent(); if (content.modules?.credit === false) notFound(); return <main className="section page-grid"><div className="page-copy"><p className="eyebrow dark">CRÉDITO HIPOTECARIO</p><h1>Explora opciones de financiación.</h1><p>EXIN Grupo te acompaña para iniciar una conversación sobre crédito hipotecario o leasing habitacional.</p><p>La aprobación, condiciones y productos disponibles dependen de la entidad financiera correspondiente. EXIN no garantiza resultados de crédito.</p><div className="info-box">El contenido financiero detallado, los aliados y las condiciones vigentes están pendientes de validación y configuración por EXIN.</div></div><RequestForm kind="credit" /></main> }
