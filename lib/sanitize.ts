import DOMPurify from 'isomorphic-dompurify'

const FORBID_TAGS = ['script', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'link', 'meta']
const FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover', 'style', 'href', 'src', 'xlink:href']

/**
 * Sanitize untrusted text/HTML using DOMPurify (server-safe via isomorphic-dompurify).
 * Strips dangerous tags and attributes; returns plain safe text for storage.
 */
export function sanitizeText(input: string): string {
  const purified = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORBID_TAGS,
    FORBID_ATTR,
    KEEP_CONTENT: true,
  })

  return purified
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Validate a comment body: DOMPurify strip, then check length constraints.
 */
export function validateCommentContent(
  raw: string,
  min = 1,
  max = 1000,
): { valid: boolean; content: string; error?: string } {
  const content = sanitizeText(raw)

  if (content.length < min) {
    return {
      valid: false,
      content,
      error: `Comment must be at least ${min} character${min > 1 ? 's' : ''}`,
    }
  }
  if (content.length > max) {
    return { valid: false, content, error: `Comment must be at most ${max} characters` }
  }

  return { valid: true, content }
}

/**
 * Detect obvious XSS payloads before sanitization (defense in depth).
 */
export function containsDangerousMarkup(input: string): boolean {
  const lowered = input.toLowerCase()
  return (
    /<script\b/i.test(lowered) ||
    /<iframe\b/i.test(lowered) ||
    /<object\b/i.test(lowered) ||
    /<embed\b/i.test(lowered) ||
    /<svg\b/i.test(lowered) ||
    /javascript:/i.test(lowered) ||
    /on\w+\s*=/i.test(lowered)
  )
}
