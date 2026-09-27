export function getWhatsAppUrl(phone: string, message?: string) {
  const number = phone.replace(/\D/g, '')
  if (!number) return null
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${query}`
}
