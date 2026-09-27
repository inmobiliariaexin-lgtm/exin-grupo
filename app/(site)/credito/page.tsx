import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
import { CreditPartners } from '@/components/credit-partners'
import { getCreditContent, getHomeContent } from '@/lib/site-data'
import { createSupabasePublicClient } from '@/lib/supabase/public'

export const metadata: Metadata = { title: 'Crédito hipotecario', description: 'Solicita orientación para explorar opciones de financiación inmobiliaria.' }

type SearchParams = { propertyId?: string; propertyCode?: string }

export default async function CreditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [content, params] = await Promise.all([getHomeContent(), searchParams])
  if (content.modules?.credit === false) notFound()
  const credit = await getCreditContent(content.credit_title)

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.propertyId ?? '')
  const propertyCode = params.propertyCode?.trim().slice(0, 64) ?? ''
  let property: { id: string; verification_code: string; title: string } | null = null
  if (isUuid && propertyCode) {
    const { data } = await createSupabasePublicClient().from('properties').select('id,verification_code,title').eq('id', params.propertyId).eq('status', 'published').maybeSingle()
    if (data?.verification_code === propertyCode) property = data
  }

  return <main className="section page-grid credit-page">
    <div className="page-copy">
      <p className="eyebrow dark">CRÉDITO HIPOTECARIO</p>
      <h1>{credit.title}</h1>
      <p>{credit.introduction}</p>
      {property && <p className="info-box">Esta solicitud quedará asociada al inmueble “{property.title}” (código {property.verification_code}).</p>}
      <p className="info-box">{credit.disclaimer}</p>
    </div>
    <RequestForm kind="credit" propertyId={property?.id} propertyCode={property?.verification_code} />
    <CreditPartners banks={credit.banks.filter((bank) => bank.active)} />
  </main>
}
