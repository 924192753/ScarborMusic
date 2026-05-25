import { type NextRequest } from 'next/server'

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

import { badRequest, handleApiError, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { ensureBucket, getPublicUrl, getS3Client } from '@/lib/s3'
import { enforceRateLimit } from '@/lib/rate-limit'
import { logUploadAudit } from '@/lib/upload-audit'
import {
  type FileCategory,
  generateObjectKey,
  sanitizeStoredFileName,
  validateUploadRequest,
} from '@/lib/upload'

const presignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  fileType: z.enum(['image', 'audio']),
})

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ──────────────────────────────────────────────────────────────
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    // ─── Validate request body ──────────────────────────────────────────────
    const parsed = await parseBody(request, presignedUrlSchema)
    if (!('data' in parsed)) return parsed

    const { filename, contentType, fileSize, fileType } = parsed.data

    const rateLimited = await enforceRateLimit('upload', user.sub)
    if (rateLimited) return rateLimited

    const validation = validateUploadRequest(
      contentType,
      fileSize,
      fileType as FileCategory,
      filename,
    )
    if (!validation.valid) {
      await logUploadAudit({
        userId: user.sub,
        fileName: filename,
        mimeType: contentType,
        fileType,
        status: 'rejected',
        reason: validation.error,
        request,
      })
      return badRequest(validation.error ?? 'Invalid file')
    }

    await logUploadAudit({
      userId: user.sub,
      fileName: sanitizeStoredFileName(filename, fileType as FileCategory),
      mimeType: contentType,
      fileType,
      status: 'allowed',
      request,
    })

    // ─── Ensure bucket exists ───────────────────────────────────────────────
    await ensureBucket()

    // ─── Generate object key ────────────────────────────────────────────────
    const objectKey = generateObjectKey(user.sub, contentType, fileType as FileCategory)
    const bucket = process.env.S3_BUCKET ?? 'scarbormusic'

    // ─── Generate presigned PUT URL (10 minute expiry) ──────────────────────
    const client = getS3Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      // Tag for lifecycle management
      Tagging: `userId=${user.sub}&fileType=${fileType}`,
    })

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 })
    const publicUrl = getPublicUrl(objectKey)

    return ok({ uploadUrl, objectKey, publicUrl }, 'Presigned upload URL generated successfully')
  } catch (error) {
    return handleApiError(error, 'presigned-url')
  }
}
