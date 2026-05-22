import { type NextRequest, NextResponse } from 'next/server'

import { verifyAccessToken } from '@/lib/jwt'
import { ROLES } from '@/lib/rbac'

const PROTECTED_PREFIXES = ['/profile', '/admin', '/uploads', '/playlists', '/favorites']
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

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
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
    '/playlists/:path*',
    '/playlists',
    '/favorites/:path*',
    '/favorites',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
