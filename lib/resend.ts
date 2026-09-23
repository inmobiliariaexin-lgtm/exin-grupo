export function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || process.env.EXIN_RESEND_API_KEY?.trim() || ''
}
