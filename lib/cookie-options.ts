/**
 * Production defaults to Secure cookies (HTTPS only).
 * Set COOKIE_SECURE=false in .env.production for IP + HTTP testing without TLS.
 */
export function useSecureCookies(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  return process.env.NODE_ENV === 'production'
}
