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

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'm4a'] as const

export const DANGEROUS_EXTENSIONS = [
  'exe',
  'dll',
  'php',
  'jsp',
  'asp',
  'aspx',
  'js',
  'mjs',
  'cjs',
  'bat',
  'cmd',
  'sh',
  'bash',
  'py',
  'rb',
  'pl',
  'cgi',
  'htaccess',
  'svg',
  'html',
  'htm',
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

const MIME_NORMALIZE: Record<string, string> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/x-flac': 'audio/flac',
  'audio/x-aac': 'audio/aac',
}

export function normalizeMime(mime: string): string {
  return MIME_NORMALIZE[mime] ?? mime
}

export function extractExtension(filename: string): string {
  const ext = path.extname(filename).replace('.', '').toLowerCase()
  return ext
}

export function isDangerousExtension(ext: string): boolean {
  return (DANGEROUS_EXTENSIONS as readonly string[]).includes(ext.toLowerCase())
}

export function isAllowedExtension(ext: string, category: FileCategory): boolean {
  const allowed =
    category === 'image' ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_AUDIO_EXTENSIONS
  return (allowed as readonly string[]).includes(ext.toLowerCase())
}

/**
 * Validate original filename extension against whitelist and dangerous blacklist.
 */
export function validateFilename(
  filename: string,
  category: FileCategory,
): { valid: boolean; error?: string; extension?: string } {
  const ext = extractExtension(filename)
  if (!ext) {
    return { valid: false, error: 'File must have a valid extension' }
  }
  if (isDangerousExtension(ext)) {
    return { valid: false, error: `File extension ".${ext}" is not allowed` }
  }
  if (!isAllowedExtension(ext, category)) {
    return {
      valid: false,
      error: `Extension ".${ext}" is not allowed for ${category} uploads`,
    }
  }
  return { valid: true, extension: ext }
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
  filename?: string,
): UploadValidationResult {
  const normalized = normalizeMime(contentType)

  if (filename) {
    const nameCheck = validateFilename(filename, fileCategory)
    if (!nameCheck.valid) {
      return { valid: false, error: nameCheck.error }
    }
    const extMime = MIME_TO_EXT[normalized]
    if (extMime && nameCheck.extension && nameCheck.extension !== extMime) {
      const alt = nameCheck.extension === 'jpeg' && extMime === 'jpg'
      if (!alt) {
        return {
          valid: false,
          error: `Filename extension ".${nameCheck.extension}" does not match MIME type "${contentType}"`,
        }
      }
    }
  }

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

/**
 * Strict dual MIME validation: declared Content-Type must match magic-byte detection.
 */
export function validateDualMime(
  declaredMime: string,
  detectedMime: string,
): { valid: boolean; error?: string } {
  const declared = normalizeMime(declaredMime)
  const detected = normalizeMime(detectedMime)

  if (declared !== detected) {
    return {
      valid: false,
      error: `MIME mismatch: declared "${declaredMime}" but file is "${detectedMime}"`,
    }
  }

  return { valid: true }
}

// ─── Magic Number Detection ───────────────────────────────────────────────────

export async function detectMagicType(
  buffer: Uint8Array | Buffer,
): Promise<{ mime: string; ext: string } | null> {
  const { fileTypeFromBuffer } = await import('file-type')
  const result = await fileTypeFromBuffer(buffer)
  if (!result) return null
  return { mime: result.mime, ext: result.ext }
}

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

  if (isDangerousExtension(detected.ext)) {
    return {
      valid: false,
      detected: detected.mime,
      error: `Detected dangerous file type "${detected.ext}"`,
    }
  }

  const normalizedDetected = normalizeMime(detected.mime)
  const normalizedDeclared = normalizeMime(declaredMime)

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

  const dual = validateDualMime(normalizedDeclared, normalizedDetected)
  if (!dual.valid) {
    return { valid: false, detected: detected.mime, error: dual.error }
  }

  return { valid: true, detected: detected.mime }
}

// ─── Object Key Generator ─────────────────────────────────────────────────────

/**
 * Generate a unique, randomized S3 object key (never uses user-supplied filename).
 */
export function generateObjectKey(
  userId: string,
  contentType: string,
  category: FileCategory,
): string {
  const normalized = normalizeMime(contentType)
  const ext = MIME_TO_EXT[normalized] ?? 'bin'
  const date = new Date().toISOString().slice(0, 10)
  const uuid = randomUUID()
  return `${category}s/${userId}/${date}/${uuid}.${ext}`
}

/**
 * Sanitize display filename stored in DB (strip path traversal, randomize base).
 */
export function sanitizeStoredFileName(originalName: string, category: FileCategory): string {
  const base = path.basename(originalName).replace(/[^\w.\-]/g, '_').slice(0, 200)
  const ext = extractExtension(base)
  if (!ext || isDangerousExtension(ext) || !isAllowedExtension(ext, category)) {
    const fallback = category === 'image' ? 'jpg' : 'mp3'
    return `${randomUUID()}.${fallback}`
  }
  return `${randomUUID()}.${ext}`
}
