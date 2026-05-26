import { type NextRequest } from 'next/server'

import { unauthorized } from '@/lib/api'
import { type JwtPayload } from '@/lib/jwt'
import { getAuthUser, requireAdmin, requireRole } from '@/lib/rbac'

export { getAuthUser, requireAdmin, requireRole }

/**
 * Require authentication for an API route.
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
  const result = await requireAdmin(request)
  if ('status' in result) return result
  return result
}
