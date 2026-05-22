import { type NextRequest, NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/jwt'

// Routes that require authentication
const PROTECTED_PREFIXES = ['/profile', '/admin', '/uploads']

// Routes accessible only to ADMIN role
const ADMIN_PREFIXES = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const payload = await verifyAccessToken(accessToken)

    // Admin-only routes: verify ADMIN role
    const isAdminRoute = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    if (isAdminRoute && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Pass user info to downstream headers for server components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-user-email', payload.email)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token invalid or expired — redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    // Clear the stale token
    response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/admin/:path*',
    '/uploads/:path*',
    '/uploads',
    // Exclude Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
