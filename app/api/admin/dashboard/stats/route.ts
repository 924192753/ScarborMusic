import { type NextRequest } from 'next/server'

import { dailyPlaysKey } from '@/lib/admin-utils'
import { startOfTodayUtc } from '@/lib/admin-utils'
import { handleApiError, ok } from '@/lib/api'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const todayStart = startOfTodayUtc()

    const [totalUsers, totalSongs, totalComments, totalPlaylists, todayNewUsers] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.song.count({ where: { deletedAt: null } }),
        prisma.comment.count({ where: { deletedAt: null, status: { not: 'DELETED' } } }),
        prisma.playlist.count({ where: { deletedAt: null } }),
        prisma.user.count({
          where: { deletedAt: null, createdAt: { gte: todayStart } },
        }),
      ])

    let todayPlays = 0
    try {
      const count = await redis.get(dailyPlaysKey())
      todayPlays = count ? parseInt(count, 10) : 0
    } catch {
      todayPlays = 0
    }

    return ok({
      totalUsers,
      totalSongs,
      totalComments,
      totalPlaylists,
      todayNewUsers,
      todayPlays,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/dashboard/stats')
  }
}
