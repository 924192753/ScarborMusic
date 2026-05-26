import { type NextRequest } from 'next/server'

import { buildPagination } from '@/lib/admin-utils'
import { handleApiError, ok } from '@/lib/api'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminListUsersSchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const url = new URL(request.url)
    const parsed = adminListUsersSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? 'Invalid query'))
    }

    const { page, pageSize, q } = parsed.data
    const where = {
      deletedAt: null,
      ...(q && {
        OR: [{ username: { contains: q } }, { email: { contains: q } }],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return ok({ users, pagination: buildPagination(page, pageSize, total) })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/users')
  }
}
