import { type NextRequest } from 'next/server'

import { unauthorized } from '@/lib/api'
import { type JwtPayload, verifyAccessToken } from '@/lib/jwt'

/**
 * Extract and verify the access token from a request's cookies.
 * Returns the decoded JWT payload or null if unauthenticated.
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
 * Require authentication for an API route.
 * Returns the user payload or an unauthorized NextResponse.
 */
export async function requireAuthUser(
  request: NextRequest,
): Promise<JwtPayload | ReturnType<typeof unauthorized>> {
  const user = await getAuthUser(request)
  if (!user) return unauthorized('Authentication required')
  return user
}

/**
 * Require ADMIN role for an API route.
 */
export async function requireAdminUser(
  request: NextRequest,
): Promise<JwtPayload | ReturnType<typeof unauthorized>> {
  const user = await getAuthUser(request)
  if (!user) return unauthorized('Authentication required')
  if (user.role !== 'ADMIN') return unauthorized('Admin access required')
  return user
}
