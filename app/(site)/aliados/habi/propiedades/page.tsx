import { redirect } from 'next/navigation'

export default async function LegacyHabiPropertiesPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const { offset: rawOffset } = await searchParams
  const offset = rawOffset && /^\d+$/.test(rawOffset) ? Math.min(1_000_000, Number(rawOffset)) : 0
  const page = Math.floor(offset / 24) + 1
  redirect(`/propiedades?source=habi${page > 1 ? `&page=${page}` : ''}`)
}
