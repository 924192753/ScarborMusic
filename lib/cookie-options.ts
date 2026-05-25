/**
 * Secure cookies require HTTPS. IP + HTTP 部署请设置 COOKIE_SECURE=false，
 * 或 NEXT_PUBLIC_APP_URL 使用 http:// 前缀（将自动关闭 Secure）。
 */
export function shouldUseSecureCookies(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.COOKIE_SECURE === 'true') return true
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (appUrl.startsWith('http://')) return false
  return process.env.NODE_ENV === 'production'
}
