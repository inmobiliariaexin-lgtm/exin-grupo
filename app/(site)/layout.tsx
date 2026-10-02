import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { getHomeContent, getPublicSiteSettings } from '@/lib/site-data'

// Public pages read live content from Supabase; render them at request time so
// Cloudflare Builds does not wait on database requests while prerendering.
export const dynamic = 'force-dynamic'

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [contacts, content] = await Promise.all([getPublicSiteSettings(), getHomeContent()])
  return <><SiteHeader contacts={contacts} modules={content.modules ?? {}} />{children}<SiteFooter contacts={contacts} tagline={content.footer_tagline} /></>
}
