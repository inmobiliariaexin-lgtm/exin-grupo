import type { PublicSiteSettings } from '@/lib/types'

const networks = [
  { key: 'instagram', label: 'Instagram', mark: '◎' },
  { key: 'facebook', label: 'Facebook', mark: 'f' },
  { key: 'youtube', label: 'YouTube', mark: '▶' },
  { key: 'tiktok', label: 'TikTok', mark: '♪' },
  { key: 'linkedin', label: 'LinkedIn', mark: 'in' },
] as const

export function SocialLinks({ contacts }: { contacts: PublicSiteSettings }) {
  const links = networks.filter(({ key }) => contacts[key])
  if (!links.length) return null
  return <nav className="social-links" aria-label="Redes sociales">{links.map(({ key, label, mark }) => <a key={key} href={contacts[key]} target="_blank" rel="noopener noreferrer" aria-label={`EXIN Grupo en ${label}`} title={label}><span aria-hidden="true">{mark}</span><small>{label}</small></a>)}</nav>
}
