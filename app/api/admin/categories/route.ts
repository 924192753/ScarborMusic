import { type NextRequest } from 'next/server'

import { conflict, created, handleApiError, ok, parseBody } from '@/lib/api'
import { logAudit } from '@/lib/audit'
import { requireAdminUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { adminCreateCategorySchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult

    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    return ok(categories)
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/categories')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminUser(request)
    if ('status' in authResult) return authResult
    const admin = authResult

    const parsed = await parseBody(request, adminCreateCategorySchema)
    if (!('data' in parsed)) return parsed

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }] },
    })
    if (existing) return conflict('Category name or slug already exists')

    const category = await prisma.category.create({ data: parsed.data })

    await logAudit({
      adminId: admin.sub,
      action: 'create',
      resource: 'category',
      resourceId: String(category.id),
      payload: parsed.data,
    })

    return created(category, 'Category created')
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/categories')
  }
}
