import { z } from 'zod'

const base = {
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32).regex(/^[0-9+().\s-]+$/),
  email: z.email().max(254),
  consent: z.literal('on'),
  companyWebsite: z.string().max(0).optional(),
  propertyId: z.uuid().optional().or(z.literal('')),
  propertyCode: z.string().trim().max(64).optional(),
  turnstileToken: z.string().max(2048).optional(),
}

export const inquirySchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('credit'), interest: z.string().trim().min(2).max(100), message: z.string().trim().max(2000).optional() }),
  z.object({ ...base, kind: z.literal('capture'), propertyType: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80), neighborhood: z.string().trim().max(120).optional(), message: z.string().trim().max(2000).optional(), attachmentCount: z.string().regex(/^[0-6]$/).optional() }),
  z.object({ ...base, kind: z.literal('contact'), message: z.string().trim().min(2).max(2000) }),
  z.object({ ...base, kind: z.literal('appointment'), message: z.string().trim().min(2).max(2000), appointmentType: z.enum(['Visita a inmueble','Asesoría de crédito','Conversación comercial']), appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), appointmentTime: z.string().regex(/^\d{2}:\d{2}$/) }),
])
