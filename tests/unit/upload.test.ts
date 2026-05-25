import { describe, expect, it } from 'vitest'

import {
  detectMagicType,
  extractExtension,
  generateObjectKey,
  isAllowedExtension,
  isDangerousExtension,
  MAX_AUDIO_SIZE,
  MAX_IMAGE_SIZE,
  normalizeMime,
  sanitizeStoredFileName,
  validateDualMime,
  validateFilename,
  validateMagicNumber,
  validateUploadRequest,
} from '@/lib/upload'

// Minimal valid PNG header bytes
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
  0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
  0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
  0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

describe('upload security', () => {
  it('blocks dangerous extensions', () => {
    expect(isDangerousExtension('exe')).toBe(true)
    expect(isDangerousExtension('php')).toBe(true)
    expect(isDangerousExtension('js')).toBe(true)
    expect(isDangerousExtension('jpg')).toBe(false)
  })

  it('allows only whitelisted image extensions', () => {
    expect(isAllowedExtension('png', 'image')).toBe(true)
    expect(isAllowedExtension('gif', 'image')).toBe(false)
  })

  it('rejects dangerous filename', () => {
    const result = validateFilename('malware.exe', 'image')
    expect(result.valid).toBe(false)
  })

  it('rejects extension mismatch with MIME', () => {
    const result = validateUploadRequest('image/png', 1024, 'image', 'song.mp3')
    expect(result.valid).toBe(false)
  })

  it('accepts valid image upload request', () => {
    const result = validateUploadRequest('image/png', 1024, 'image', 'cover.png')
    expect(result.valid).toBe(true)
  })

  it('enforces dual MIME match', () => {
    expect(validateDualMime('image/png', 'image/png').valid).toBe(true)
    expect(validateDualMime('image/png', 'image/jpeg').valid).toBe(false)
  })

  it('normalizes audio mime variants', () => {
    expect(normalizeMime('audio/mp3')).toBe('audio/mpeg')
  })

  it('generates randomized object keys', () => {
    const key = generateObjectKey('user-1', 'image/png', 'image')
    expect(key).toMatch(/^images\/user-1\/\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.png$/)
  })

  it('sanitizes stored filename with safe extension', () => {
    const name = sanitizeStoredFileName('../../evil.png', 'image')
    expect(name).toMatch(/^[a-f0-9-]+\.png$/)
    expect(name).not.toContain('..')
  })

  it('extracts extension from filename', () => {
    expect(extractExtension('track.flac')).toBe('flac')
  })

  it('detects PNG magic bytes', async () => {
    const detected = await detectMagicType(PNG_BYTES)
    expect(detected?.mime).toBe('image/png')
  })

  it('validates magic number for PNG', async () => {
    const result = await validateMagicNumber(PNG_BYTES, 'image/png', 'image')
    expect(result.valid).toBe(true)
    expect(result.detected).toBe('image/png')
  })

  it('rejects invalid magic buffer', async () => {
    const result = await validateMagicNumber(Buffer.from('not a file'), 'image/png', 'image')
    expect(result.valid).toBe(false)
  })

  it('rejects oversized image', () => {
    const result = validateUploadRequest('image/png', MAX_IMAGE_SIZE + 1, 'image', 'a.png')
    expect(result.valid).toBe(false)
  })

  it('rejects oversized audio', () => {
    const result = validateUploadRequest('audio/mpeg', MAX_AUDIO_SIZE + 1, 'audio', 'a.mp3')
    expect(result.valid).toBe(false)
  })

  it('rejects disallowed audio MIME', () => {
    const result = validateUploadRequest('video/mp4', 1024, 'audio', 'a.mp3')
    expect(result.valid).toBe(false)
  })

  it('rejects filename without extension', () => {
    const result = validateFilename('noextension', 'image')
    expect(result.valid).toBe(false)
  })

  it('falls back sanitize filename for bad extension', () => {
    const name = sanitizeStoredFileName('bad.gif', 'image')
    expect(name).toMatch(/^[a-f0-9-]+\.jpg$/)
  })
})
