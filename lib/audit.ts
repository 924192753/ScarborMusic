import { type Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export interface AuditLogInput {
  adminId: string
  action: string
  resource: string
  resourceId?: string | null
  payload?: Record<string, unknown>
}

/**
 * Record an admin operation in the audit log.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
