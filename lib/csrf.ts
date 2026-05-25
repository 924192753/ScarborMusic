import { type NextRequest, type NextResponse } from 'next/server'

import { forbidden } from '@/lib/api'

export const CSRF_COOKIE_NAME = 'csrf_token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
])

const UNSAFE_METHODS = new Set(['POST', 'PATCH', 'DELETE', 'PUT'])

/** Edge-compatible CSRF token (Web Crypto API). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.has(pathname)
}

export function requiresCsrfValidation(method: string, pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false
  if (!UNSAFE_METHODS.has(method.toUpperCase())) return false
  return !isCsrfExemptPath(pathname)
}

export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) return false
  return cookieToken === headerToken
}

export function applyCsrfCookie(response: NextResponse, token: string): void {
  const isProd = process.env.NODE_ENV === 'production'
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export function ensureCsrfCookieOnResponse(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!existing) {
    applyCsrfCookie(response, generateCsrfToken())
  }
  return response
}

export function csrfForbiddenResponse(): ReturnType<typeof forbidden> {
  return forbidden('Invalid or missing CSRF token')
}
