import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { getHomeContent, getPublicSiteSettings } from '@/lib/site-data'
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [contacts, content] = await Promise.all([getPublicSiteSettings(), getHomeContent()])
  return <><SiteHeader contacts={contacts} modules={content.modules ?? {}} />{children}<SiteFooter contacts={contacts} /></>
}
