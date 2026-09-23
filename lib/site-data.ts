import { hasSupabasePublicEnv } from '@/lib/supabase/env'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import type { HomeContent, Property, PublicSiteSettings } from '@/lib/types'
import { defaultHomeContent, defaultPublicSiteSettings } from '@/lib/types'

export async function getHomeContent(): Promise<HomeContent> {
  if (!hasSupabasePublicEnv()) return defaultHomeContent
  try {
    const supabase = createSupabasePublicClient()
    const [{ data }, { data: rows }] = await Promise.all([supabase.from('site_modules').select('content,enabled').eq('module_key', 'home').maybeSingle(), supabase.from('site_modules').select('module_key,enabled')])
    const modules: Record<string,boolean> = Object.fromEntries((rows ?? []).map((row) => [row.module_key, row.enabled]))
    return { ...defaultHomeContent, ...(data?.enabled ? data.content as Partial<HomeContent> : undefined), modules }
  } catch { return defaultHomeContent }
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  if (!hasSupabasePublicEnv()) return defaultPublicSiteSettings
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase.from('site_settings').select('setting_key,value').eq('is_public', true).in('setting_key', ['phone','email','whatsapp','instagram','facebook'])
    return { ...defaultPublicSiteSettings, ...Object.fromEntries((data ?? []).map((row) => [row.setting_key, String(row.value ?? '')])) }
  } catch { return defaultPublicSiteSettings }
}

export async function getRentEnabled(): Promise<boolean> {
  if (!hasSupabasePublicEnv()) return false
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase.from('site_modules').select('enabled').eq('module_key','rent').maybeSingle()
    return data?.enabled === true
  } catch { return false }
}

export async function getPublicProperties(featuredOnly = false, rentalsEnabled?: boolean): Promise<Property[]> {
  if (!hasSupabasePublicEnv()) return []
  try {
    const supabase = createSupabasePublicClient()
    let query = supabase.from('properties').select('id,verification_code,slug,title,operation,property_type,price,city,neighborhood,description,bedrooms,bathrooms,area_m2,status,is_featured').eq('status', 'published')
    if (featuredOnly) query = query.eq('is_featured', true)
    if (!(rentalsEnabled ?? await getRentEnabled())) query = query.eq('operation','sale')
    const { data, error } = await query.order('published_at', { ascending: false }).limit(featuredOnly ? 5 : 100)
    if (error || !data?.length) return []
    const ids = data.map((item) => item.id)
    const { data: images } = await supabase.from('property_images').select('property_id,storage_path').in('property_id', ids).eq('is_cover', true)
    const urls = new Map((images ?? []).map((image) => [image.property_id, supabase.storage.from('property-images').getPublicUrl(image.storage_path).data.publicUrl]))
    return data.map((item) => ({ ...item, cover_url: urls.get(item.id) ?? null })) as Property[]
  } catch { return [] }
}

export async function searchPublishedProperties(filters: { query?:string; city?:string; type?:string; operation?:'sale'|'rent'; bedrooms?:number; bathrooms?:number; minArea?:number; maxArea?:number; sort?:string; page?:number }, rentalsEnabled:boolean) {
  if (!hasSupabasePublicEnv()) return { properties:[] as Property[], total:0, page:1, pageSize:24 }
  try {
    const supabase=createSupabasePublicClient(),page=Math.min(1000,Math.max(1,filters.page||1)),pageSize=24
    let query=supabase.from('properties').select('id,verification_code,slug,title,operation,property_type,price,city,neighborhood,description,bedrooms,bathrooms,area_m2,status,is_featured,published_at',{count:'exact'}).eq('status','published')
    if(!rentalsEnabled||filters.operation==='sale')query=query.eq('operation','sale')
    else if(filters.operation==='rent')query=query.eq('operation','rent')
    if(filters.city)query=query.eq('city',filters.city)
    if(filters.type)query=query.eq('property_type',filters.type)
    if(filters.bedrooms!==undefined)query=query.gte('bedrooms',filters.bedrooms)
    if(filters.bathrooms!==undefined)query=query.gte('bathrooms',filters.bathrooms)
    if(filters.minArea!==undefined)query=query.gte('area_m2',filters.minArea)
    if(filters.maxArea!==undefined)query=query.lte('area_m2',filters.maxArea)
    const term=filters.query?.trim()
    if(term&&/^[\p{L}\p{N}\s-]{1,100}$/u.test(term))query=query.or(`title.ilike.%${term}%,city.ilike.%${term}%,neighborhood.ilike.%${term}%,verification_code.eq.${term}`)
    if(filters.sort==='price_asc')query=query.order('price',{ascending:true,nullsFirst:false})
    else if(filters.sort==='price_desc')query=query.order('price',{ascending:false,nullsFirst:false})
    else query=query.order('published_at',{ascending:false,nullsFirst:false})
    const {data,error,count}=await query.range((page-1)*pageSize,page*pageSize-1)
    if(error||!data?.length)return{properties:[] as Property[],total:count??0,page,pageSize}
    const ids=data.map((row)=>row.id),{data:images}=await supabase.from('property_images').select('property_id,storage_path').in('property_id',ids).eq('is_cover',true)
    const urls=new Map((images??[]).map((image)=>[image.property_id,supabase.storage.from('property-images').getPublicUrl(image.storage_path).data.publicUrl]))
    return{properties:data.map((row)=>({...row,cover_url:urls.get(row.id)??null})) as Property[],total:count??0,page,pageSize}
  } catch{return{properties:[] as Property[],total:0,page:1,pageSize:24}}
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  if (!hasSupabasePublicEnv()) return null
  try {
    const supabase = createSupabasePublicClient()
    const { data, error } = await supabase.from('properties').select('id,verification_code,slug,title,operation,property_type,price,city,neighborhood,description,bedrooms,bathrooms,area_m2,status,is_featured').eq('slug', slug).eq('status', 'published').maybeSingle()
    if (error || !data) return null
    if (data.operation === 'rent' && !await getRentEnabled()) return null
    const { data: images } = await supabase.from('property_images').select('storage_path,is_cover,alt_text').eq('property_id', data.id).order('sort_order')
    const gallery = (images ?? []).map((image) => ({ url: supabase.storage.from('property-images').getPublicUrl(image.storage_path).data.publicUrl, alt: image.alt_text, cover: image.is_cover }))
    return { ...data, cover_url: gallery.find((image) => image.cover)?.url ?? gallery[0]?.url ?? null, gallery } as Property & { gallery: { url: string; alt: string; cover: boolean }[] }
  } catch { return null }
}

export async function getActiveCities(): Promise<string[]> {
  if (!hasSupabasePublicEnv()) return ['Bogotá']
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase.from('locations').select('city').eq('active', true).order('sort_order')
    return data?.length ? [...new Set(data.map((item) => item.city))] : ['Bogotá']
  } catch { return ['Bogotá'] }
}

export async function getActivePropertyTypes(): Promise<string[]> {
  if (!hasSupabasePublicEnv()) return ['Apartamento', 'Casa', 'Lote']
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase.from('property_types').select('name').eq('active', true).order('sort_order')
    return data?.length ? data.map((item) => item.name) : ['Apartamento', 'Casa', 'Lote']
  } catch { return ['Apartamento', 'Casa', 'Lote'] }
}

export function formatPropertyPrice(price: number | null) {
  if (price === null || price === undefined) return 'Precio por consultar'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
}
