import { type NextRequest } from 'next/server'

import { conflict, created, handleApiError, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminCreateTagSchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
    return ok(tags)
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/tags')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const parsed = await parseBody(request, adminCreateTagSchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.tag.findFirst({
      where: { OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }] },
    })
    if (existing) return conflict('Tag name or slug already exists')

    const tag = await prisma.tag.create({ data: parsed.data })

    await logAudit({
      adminId: admin.sub,
      action: 'create',
      resource: 'tag',
      resourceId: String(tag.id),
      payload: parsed.data,
    })

    return created(tag, 'Tag created')
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/tags')
  }
}
