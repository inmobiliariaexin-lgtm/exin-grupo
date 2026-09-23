export const maxImageBytes = 3 * 1024 * 1024
export function detectImageType(buffer: Uint8Array): { mime: string; extension: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' }
  if (buffer.length >= 8 && buffer.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return { mime: 'image/png', extension: 'png' }
  if (buffer.length >= 12 && String.fromCharCode(...buffer.slice(0, 4)) === 'RIFF' && String.fromCharCode(...buffer.slice(8, 12)) === 'WEBP') return { mime: 'image/webp', extension: 'webp' }
  if (buffer.length >= 12 && String.fromCharCode(...buffer.slice(4, 8)) === 'ftyp' && /^(avif|avis)$/.test(String.fromCharCode(...buffer.slice(8, 12)))) return { mime: 'image/avif', extension: 'avif' }
  return null
}
