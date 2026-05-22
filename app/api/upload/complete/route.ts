import { type NextRequest } from 'next/server'

import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'

import { badRequest, handleApiError, ok, parseBody, type unauthorized } from '@/lib/api'
import { requireAuthUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getPublicUrl, getS3Client } from '@/lib/s3'
import { type FileCategory, validateMagicNumber } from '@/lib/upload'

const completeSchema = z.object({
  objectKey: z.string().min(1).max(512),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  fileType: z.enum(['image', 'audio']),
})

// Bytes needed for magic number detection (covers all supported formats)
const MAGIC_BYTES_SIZE = 4100

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ──────────────────────────────────────────────────────────────
    const authResult = await requireAuthUser(request)
    if ('status' in authResult) return authResult as ReturnType<typeof unauthorized>
    const user = authResult

    // ─── Validate request ───────────────────────────────────────────────────
    const parsed = await parseBody(request, completeSchema)
    if (!('data' in parsed)) return parsed

    const { objectKey, fileName, mimeType, fileType } = parsed.data
    const bucket = process.env.S3_BUCKET ?? 'scarbormusic'
    const client = getS3Client()

    // ─── Verify file exists in S3 ───────────────────────────────────────────
    let fileSize: bigint
    let etag: string

    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
      fileSize = BigInt(head.ContentLength ?? 0)
      etag = head.ETag?.replace(/"/g, '') ?? ''
    } catch {
      return badRequest('File not found in storage. Please upload the file first.')
    }

    // ─── Magic number validation ─────────────────────────────────────────────
    try {
      const rangeResponse = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Range: `bytes=0-${MAGIC_BYTES_SIZE - 1}`,
        }),
      )

      // Convert stream to buffer for magic number detection
      const chunks: Uint8Array[] = []
      if (rangeResponse.Body) {
        // AWS SDK Body is an async iterable in Node.js
        for await (const chunk of rangeResponse.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk)
        }
      }
      const buffer = Buffer.concat(chunks)

      const magicResult = await validateMagicNumber(buffer, mimeType, fileType as FileCategory)
      if (!magicResult.valid) {
        // Delete the invalid file from S3 immediately
        try {
          const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
        } catch {
          console.error('[upload/complete] Failed to delete invalid file:', objectKey)
        }
        return badRequest(
          magicResult.error ?? `File type validation failed. Detected: ${magicResult.detected}`,
        )
      }
    } catch (magicError) {
      console.error('[upload/complete] Magic number check failed:', magicError)
      // If we can't verify, err on the side of caution only for suspicious content-types
      const suspiciousMimes = ['application/octet-stream', 'text/plain', 'application/x-executable']
      if (suspiciousMimes.includes(mimeType)) {
        return badRequest('File type could not be verified. Please upload a valid file.')
      }
    }

    // ─── Persist to database ────────────────────────────────────────────────
    const existingFile = await prisma.uploadedFile.findUnique({ where: { objectKey } })
    if (existingFile) {
      return ok(
        { id: existingFile.id, url: existingFile.url, size: existingFile.size.toString(), etag },
        'File already recorded',
      )
    }

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        userId: user.sub,
        fileName,
        objectKey,
        url: getPublicUrl(objectKey),
        mimeType,
        size: fileSize,
        fileType,
      },
    })

    return ok(
      {
        id: uploadedFile.id,
        url: uploadedFile.url,
        objectKey: uploadedFile.objectKey,
        size: uploadedFile.size.toString(),
        etag,
        mimeType: uploadedFile.mimeType,
        fileType: uploadedFile.fileType,
        createdAt: uploadedFile.createdAt,
      },
      'File upload confirmed successfully',
    )
  } catch (error) {
    return handleApiError(error, 'upload/complete')
  }
}
