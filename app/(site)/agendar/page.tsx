import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestForm } from '@/components/request-form'
export const metadata: Metadata = { title: 'Solicitar una cita', description: 'Solicita una fecha y hora para conversar con EXIN Grupo.' }
export default async function AppointmentRequestPage({ searchParams }: { searchParams: Promise<{ propertyId?: string; propertyCode?: string }> }) {
  const params=await searchParams
  let propertyId='', propertyCode=''
  if(params.propertyId){ const {createSupabasePublicClient}=await import('@/lib/supabase/public'); const {data}=await createSupabasePublicClient().from('properties').select('id,verification_code,status').eq('id',params.propertyId).eq('status','published').maybeSingle(); if(!data)notFound(); propertyId=data.id;propertyCode=data.verification_code }
  else if(params.propertyCode)propertyCode=params.propertyCode
  return <main className="section page-grid"><div className="page-copy"><p className="eyebrow dark">AGENDA EXIN GRUPO</p><h1>Solicita una cita.</h1><p>Indica una fecha y hora preferidas. La solicitud queda pendiente hasta que el equipo confirme la disponibilidad.</p>{propertyCode&&<p className="info-box">Inmueble de interés: código {propertyCode}</p>}<p>La hora se interpreta en la zona horaria de Colombia (UTC−5). Recibirás un correo cuando la cita quede confirmada, si EXIN habilitó sus notificaciones.</p></div><RequestForm kind="appointment" propertyId={propertyId} propertyCode={propertyCode} /></main>
}
