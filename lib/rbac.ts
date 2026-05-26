import { type NextRequest, type NextResponse } from 'next/server'

import { type ApiError, forbidden, unauthorized } from '@/lib/api'
import { type JwtPayload, verifyAccessToken } from '@/lib/jwt'

export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]

/**
 * Extract and verify the access token from a request's cookies.
 */
export async function getAuthUser(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get('access_token')?.value
  if (!token) return null
  try {
    return await verifyAccessToken(token)
  } catch {
    return null
  }
}

/**
 * Require one or more roles for an API route.
 */
export async function requireRole(
  request: NextRequest,
  roles: RoleName | RoleName[],
): Promise<JwtPayload | NextResponse<ApiError>> {
  const user = await getAuthUser(request)
  if (!user) return unauthorized('Authentication required')

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(user.role as RoleName)) {
    return forbidden('Insufficient permissions')
  }

  return user
}

/**
 * Require ADMIN role for an API route.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<JwtPayload | NextResponse<ApiError>> {
  return requireRole(request, ROLES.ADMIN)
}
