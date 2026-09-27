export type CreditBank = {
  id: string
  name: string
  description: string
  logoUrl: string
  websiteUrl: string
  buttonLabel: string
  active: boolean
}

export type CreditContent = {
  title: string
  introduction: string
  disclaimer: string
  banks: CreditBank[]
}

export const defaultCreditContent: CreditContent = {
  title: 'Explora opciones de financiación.',
  introduction: 'EXIN Grupo te acompaña para iniciar una conversación sobre crédito hipotecario o leasing habitacional.',
  disclaimer: 'La aprobación, condiciones y productos disponibles dependen de cada entidad financiera. EXIN no garantiza resultados de crédito.',
  banks: [],
}

function text(value: unknown, fallback = '', maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback
}

export function readCreditContent(value: unknown, fallbackTitle = defaultCreditContent.title): CreditContent {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const banks = Array.isArray(data.banks) ? data.banks.slice(0, 20).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const bank = item as Record<string, unknown>
    const name = text(bank.name, '', 100)
    if (!name) return []
    return [{
      id: text(bank.id, `entidad-${index + 1}`, 80) || `entidad-${index + 1}`,
      name,
      description: text(bank.description, '', 300),
      logoUrl: text(bank.logoUrl, '', 500),
      websiteUrl: text(bank.websiteUrl, '', 500),
      buttonLabel: text(bank.buttonLabel, 'Conocer entidad', 60) || 'Conocer entidad',
      active: bank.active === true,
    }]
  }) : []

  return {
    title: text(data.title, fallbackTitle, 160) || fallbackTitle,
    introduction: text(data.introduction, defaultCreditContent.introduction, 600),
    disclaimer: text(data.disclaimer, defaultCreditContent.disclaimer, 1000),
    banks,
  }
}
