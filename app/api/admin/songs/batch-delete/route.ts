import { type NextRequest } from 'next/server'

import { handleApiError, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminBatchDeleteSongsSchema } from '@/lib/validators/admin'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const parsed = await parseBody(request, adminBatchDeleteSongsSchema)
    if (!('data' in parsed)) return parsed

    const { ids } = parsed.data
    const now = new Date()

    const result = await prisma.song.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: now, status: 'HIDDEN' },
    })

    await logAudit({
      adminId: admin.sub,
      action: 'batch_delete',
      resource: 'song',
      payload: { ids, count: result.count },
    })

    return ok({ deleted: result.count, ids }, 'Songs deleted')
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/songs/batch-delete')
  }
}
