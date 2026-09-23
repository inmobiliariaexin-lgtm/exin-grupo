'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function PropertySearch({ cities, propertyTypes, rentEnabled }: { cities: string[]; propertyTypes: string[]; rentEnabled: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [kind, setKind] = useState('')
  const [operation, setOperation] = useState('sale')
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (city) params.set('city', city)
    if (kind) params.set('type', kind)
    if (operation) params.set('operation', operation)
    router.push(`/propiedades${params.size ? `?${params}` : ''}`)
  }
  return <form className="searchbar" onSubmit={submit}><label className="search-term"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ciudad, barrio, nombre o código" aria-label="Buscar inmueble" /></label><label><span>⌂</span><select value={operation} onChange={(e) => setOperation(e.target.value)} aria-label="Operación"><option value="">Operación: todas</option><option value="sale">Venta</option>{rentEnabled&&<option value="rent">Arriendo</option>}</select></label><label><span>⌖</span><select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ciudad"><option value="">Ciudad: todas</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>⌂</span><select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo de inmueble"><option value="">Tipo: todos</option>{propertyTypes.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button search-button" type="submit">⌕ &nbsp; Buscar</button></form>
}
