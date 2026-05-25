import { type NextRequest, NextResponse } from 'next/server'

import {
  csrfForbiddenResponse,
  ensureCsrfCookieOnResponse,
  requiresCsrfValidation,
  validateCsrfToken,
} from '@/lib/csrf'
import { verifyAccessToken } from '@/lib/jwt'
import { ROLES } from '@/lib/rbac'

const PROTECTED_PREFIXES = ['/profile', '/admin', '/uploads', '/playlists', '/favorites']
const ADMIN_PREFIXES = ['/admin']

function attachCsrfIfNeeded(request: NextRequest, response: NextResponse): NextResponse {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return ensureCsrfCookieOnResponse(request, response)
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF validation for state-changing API requests
  if (requiresCsrfValidation(request.method, pathname)) {
    if (!validateCsrfToken(request)) {
      return csrfForbiddenResponse()
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) {
    const response = NextResponse.next()
    return attachCsrfIfNeeded(request, response)
  }

  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    return attachCsrfIfNeeded(request, response)
  }

  try {
    const payload = await verifyAccessToken(accessToken)

    const isAdminRoute = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    const isForbiddenPage = pathname === '/admin/forbidden'
    if (isAdminRoute && !isForbiddenPage && payload.role !== ROLES.ADMIN) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: admin access required' },
          { status: 403 },
        )
      }
      return NextResponse.rewrite(new URL('/admin/forbidden', request.url), { status: 403 })
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-user-email', payload.email)

    const response = NextResponse.next({ request: { headers: requestHeaders } })
    return attachCsrfIfNeeded(request, response)
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
    return attachCsrfIfNeeded(request, response)
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/uploads/:path*',
    '/uploads',
    '/playlists/:path*',
    '/playlists',
    '/favorites/:path*',
    '/favorites',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
