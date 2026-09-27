import type { Metadata } from 'next'
import './globals.css'
import './portal.css'
import './ux-overrides.css'
import './credit.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'EXIN Grupo | Inmuebles y crédito', template: '%s | EXIN Grupo' },
  description: 'Encuentra inmuebles y recibe acompañamiento para vender o solicitar financiación con EXIN Grupo.',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>
}
