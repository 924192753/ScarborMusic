import { randomUUID } from 'crypto'
import path from 'path'

// ─── Allowed Types & Size Limits ─────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/x-aac',
] as const

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]
export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number]
export type FileCategory = 'image' | 'audio'

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50 MB

// ─── Extension Map ────────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aac': 'aac',
  'audio/x-aac': 'aac',
}

// Normalize variant MIME types to canonical values for consistent comparison
const MIME_NORMALIZE: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/x-flac': 'audio/flac',
  'audio/x-aac': 'audio/aac',
}

export function normalizeMime(mime: string): string {
  return MIME_NORMALIZE[mime] ?? mime
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface UploadValidationResult {
  valid: boolean
  error?: string
  category?: FileCategory
}

export function validateUploadRequest(
  contentType: string,
  fileSize: number,
  fileCategory: FileCategory,
): UploadValidationResult {
  const normalized = normalizeMime(contentType)

  if (fileCategory === 'image') {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(normalized)) {
      return {
        valid: false,
        error: `Image type "${contentType}" is not allowed. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      }
    }
    if (fileSize > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Image size exceeds the 5 MB limit (got ${(fileSize / 1024 / 1024).toFixed(1)} MB)`,
      }
    }
  } else {
    if (!(ALLOWED_AUDIO_TYPES as readonly string[]).includes(normalized)) {
      return {
        valid: false,
        error: `Audio type "${contentType}" is not allowed. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`,
      }
    }
    if (fileSize > MAX_AUDIO_SIZE) {
      return {
        valid: false,
        error: `Audio size exceeds the 50 MB limit (got ${(fileSize / 1024 / 1024).toFixed(1)} MB)`,
      }
    }
  }

  return { valid: true, category: fileCategory }
}

// ─── Magic Number Detection ───────────────────────────────────────────────────

/**
 * Detect the true MIME type of a file by reading its magic bytes.
 * This prevents spoofed Content-Type headers.
 *
 * Uses a dynamic import to handle the ESM-only file-type package.
 */
export async function detectMagicType(
  buffer: Uint8Array | Buffer,
): Promise<{ mime: string; ext: string } | null> {
  const { fileTypeFromBuffer } = await import('file-type')
  const result = await fileTypeFromBuffer(buffer)
  if (!result) return null
  return { mime: result.mime, ext: result.ext }
}

/**
 * Validate that a buffer's magic bytes match the declared category.
 *
 * Rejects:
 * - Executables (.exe, .dll)
 * - Scripts (.php, .js, .py, .sh)
 * - Office documents masquerading as images/audio
 */
export async function validateMagicNumber(
  buffer: Uint8Array | Buffer,
  declaredMime: string,
  category: FileCategory,
): Promise<{ valid: boolean; detected: string | null; error?: string }> {
  const detected = await detectMagicType(buffer)

  if (!detected) {
    return {
      valid: false,
      detected: null,
      error: 'Unable to detect file type. File may be corrupted or unsupported.',
    }
  }

  const normalizedDetected = normalizeMime(detected.mime)
  const normalizedDeclared = normalizeMime(declaredMime)

  // Verify the detected type is in the allowed list for the category
  const allowedList =
    category === 'image'
      ? (ALLOWED_IMAGE_TYPES as readonly string[])
      : (ALLOWED_AUDIO_TYPES as readonly string[])

  if (!allowedList.includes(normalizedDetected)) {
    return {
      valid: false,
      detected: detected.mime,
      error: `File magic bytes indicate type "${detected.mime}" which is not allowed for ${category} uploads.`,
    }
  }

  // Warn if declared type doesn't match detected type (allow normalized variants)
  if (normalizedDetected !== normalizedDeclared) {
    // Log the mismatch but allow if the detected type is still valid
    console.warn(`[upload] MIME mismatch: declared=${declaredMime}, detected=${detected.mime}`)
  }

  return { valid: true, detected: detected.mime }
}

// ─── Object Key Generator ─────────────────────────────────────────────────────

/**
 * Generate a unique, collision-resistant S3 object key.
 * Format: {category}/{userId}/{date}/{uuid}.{ext}
 */
export function generateObjectKey(
  userId: string,
  contentType: string,
  category: FileCategory,
): string {
  const ext = MIME_TO_EXT[contentType] ?? path.extname(contentType).replace('.', '') ?? 'bin'
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const uuid = randomUUID()
  return `${category}s/${userId}/${date}/${uuid}.${ext}`
  // e.g., images/abc123/2026-05-22/550e8400-e29b-41d4-a716.jpg
}
