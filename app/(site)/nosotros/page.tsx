import type { Metadata } from 'next'
import Link from 'next/link'
export const metadata: Metadata = { title: 'Nosotros', description: 'Conoce el equipo de EXIN Grupo.' }
export default function AboutPage() { return <main className="section narrow-page"><p className="eyebrow dark">SOBRE EXIN</p><h1>Inmuebles y acompañamiento, en un mismo lugar.</h1><p>EXIN Grupo es un portal inmobiliario enfocado en la comercialización de inmuebles y en acompañar a las personas que exploran financiación.</p><p>Los datos corporativos, la historia de la empresa, los servicios definitivos y los datos de contacto se deben completar desde administración antes del lanzamiento.</p><Link className="button" href="/contacto">Habla con el equipo</Link></main> }
