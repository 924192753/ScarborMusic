import { handleApiError, ok } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    return ok(categories)
  } catch (error) {
    return handleApiError(error, 'GET /api/categories')
  }
}
