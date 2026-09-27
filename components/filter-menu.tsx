import type { ReactNode } from 'react'

export function FilterMenu({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <details className={`filter-menu ${className}`}>
    <summary className="filter-menu-trigger" aria-label="Abrir filtros" title="Filtros">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" /><circle cx="8" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="12" cy="18" r="2" /></svg>
    </summary>
    <div className="filter-menu-panel">{children}</div>
  </details>
}
