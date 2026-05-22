import { handleApiError, ok } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
    return ok(tags)
  } catch (error) {
    return handleApiError(error, 'GET /api/tags')
  }
}
