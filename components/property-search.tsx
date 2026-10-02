'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FilterMenu } from '@/components/filter-menu'

export function PropertySearch({ cities, propertyTypes, rentEnabled }: { cities: string[]; propertyTypes: string[]; rentEnabled: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [kind, setKind] = useState('')
  const [operation, setOperation] = useState('sale')
  const [source, setSource] = useState('')
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (city) params.set('city', city)
    if (kind) params.set('type', kind)
    if (operation) params.set('operation', operation)
    if (source) params.set('source', source)
    router.push(`/propiedades${params.size ? `?${params}` : ''}`)
  }
  return <form className="searchbar" onSubmit={submit}><label className="search-term"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ciudad, barrio, nombre o código" aria-label="Buscar inmueble" /></label><FilterMenu className="home-filter-menu"><p className="filter-menu-heading">Filtros</p><div className="home-filter-grid"><label><span>Origen</span><select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Origen"><option value="">EXIN y Habi</option><option value="exin">EXIN Grupo</option><option value="habi">Aliado Habi</option></select></label><label><span>Operación</span><select value={operation} onChange={(e) => setOperation(e.target.value)} aria-label="Operación"><option value="">Todas</option><option value="sale">Venta</option>{rentEnabled&&<option value="rent">Arriendo</option>}</select></label><label><span>Ciudad</span><select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ciudad"><option value="">Todas</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Tipo de inmueble</span><select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo de inmueble"><option value="">Todos</option>{propertyTypes.map((item) => <option key={item}>{item}</option>)}</select></label></div></FilterMenu><button className="button search-button" type="submit">⌕ &nbsp; Buscar</button></form>
}
