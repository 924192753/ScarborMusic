import { type NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/rate-limit'

export type UploadAuditStatus = 'allowed' | 'rejected'

export interface UploadAuditInput {
  userId: string
  fileName: string
  mimeType: string
  fileType: string
  status: UploadAuditStatus
  objectKey?: string
  reason?: string
  request?: NextRequest
}

/**
 * Persist upload attempt audit trail for security review.
 */
export async function logUploadAudit(input: UploadAuditInput): Promise<void> {
  const ip = input.request ? getClientIp(input.request) : null
  const userAgent = input.request?.headers.get('user-agent') ?? null

  await prisma.uploadAuditLog.create({
    data: {
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileType: input.fileType,
      objectKey: input.objectKey ?? null,
      status: input.status,
      reason: input.reason ?? null,
      ip,
      userAgent,
    },
  })
}
