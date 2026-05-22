/**
 * Server-side text sanitization utilities.
 *
 * For plain-text content (comments, descriptions) we strip HTML tags and
 * normalize whitespace. This prevents XSS when the content is later rendered
 * in a browser context without full HTML escaping.
 *
 * For rich-text content, use isomorphic-dompurify instead.
 */

/**
 * Strip HTML/XML tags and normalize whitespace in a plain-text string.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip all HTML tags
    .replace(/&[a-z]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? e) // decode basic entities
    .replace(/[ \t]+/g, ' ') // collapse horizontal whitespace
    .trim()
}

/**
 * Validate a comment body: strip HTML, check length constraints.
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

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}
