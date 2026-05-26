import { type NextRequest } from 'next/server'

import { ok, unauthorized } from '@/lib/api'
import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/me — return current authenticated user (from access_token cookie)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value
    if (!token) return unauthorized()

    const payload = await verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: { select: { name: true } },
      },
    })

    if (!user) return unauthorized()

    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
    })
  } catch {
    return unauthorized()
  }
}
