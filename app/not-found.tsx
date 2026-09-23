import Link from 'next/link'
export default function NotFound() { return <main className="section narrow-page"><p className="eyebrow dark">404</p><h1>Este inmueble no está disponible.</h1><p>Puede que se haya despublicado o que la dirección haya cambiado.</p><Link className="button" href="/propiedades">Ver propiedades</Link></main> }
