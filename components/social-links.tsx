import type { PublicSiteSettings } from '@/lib/types'

const networks = [
  { key: 'facebook', label: 'Facebook', path: <path d="M18.5 8H16c-.9 0-1.5.7-1.5 1.6V12h4l-.6 4h-3.4v8h-4v-8H8v-4h2.5V9.4C10.5 6.7 12.2 5 15 5h3.5v3Z" /> },
  { key: 'instagram', label: 'Instagram', path: <><rect x="4.5" y="4.5" width="15" height="15" rx="4.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.9" r=".8" fill="currentColor" stroke="none" /></> },
  { key: 'tiktok', label: 'TikTok', path: <path d="M15 3h3c.2 2.2 1.4 3.6 4 3.8v3c-1.6 0-3-.5-4-1.3v6.3a6 6 0 1 1-6-6h1v3.2h-1a2.8 2.8 0 1 0 2.8 2.8V3.1Z" /> },
] as const

export function SocialLinks({ contacts }: { contacts: PublicSiteSettings }) {
  return <div className="social-follow"><span>Síguenos</span><nav className="social-links" aria-label="Redes sociales">{networks.map(({ key, label, path }) => contacts[key] ? <a key={key} href={contacts[key]} target="_blank" rel="noopener noreferrer" aria-label={`EXIN Grupo en ${label}`} title={label}><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">{path}</svg></a> : <span className="social-icon-disabled" key={key} aria-label={`${label}: enlace pendiente de configurar`} title={`${label}: configura el enlace desde Administración`}><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">{path}</svg></span>)}</nav></div>
}
