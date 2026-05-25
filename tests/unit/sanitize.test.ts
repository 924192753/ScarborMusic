import { describe, expect, it } from 'vitest'

import {
  containsDangerousMarkup,
  sanitizeText,
  validateCommentContent,
} from '@/lib/sanitize'

describe('sanitize', () => {
  it('strips script tags', () => {
    expect(sanitizeText('<script>alert(1)</script>hello')).toBe('hello')
  })

  it('strips iframe, object, embed, svg', () => {
    expect(sanitizeText('<iframe src="x"></iframe>text')).toBe('text')
    expect(sanitizeText('<object data="x"></object>text')).toBe('text')
    expect(sanitizeText('<embed />text')).toBe('text')
    expect(sanitizeText('<svg><circle /></svg>text')).toBe('text')
  })

  it('detects dangerous markup patterns', () => {
    expect(containsDangerousMarkup('<script>x</script>')).toBe(true)
    expect(containsDangerousMarkup('javascript:alert(1)')).toBe(true)
    expect(containsDangerousMarkup('onclick=evil()')).toBe(true)
    expect(containsDangerousMarkup('plain text')).toBe(false)
  })

  it('validates comment length after sanitization', () => {
    const result = validateCommentContent('  hello world  ')
    expect(result.valid).toBe(true)
    expect(result.content).toBe('hello world')
  })

  it('rejects empty comment after sanitization', () => {
    const result = validateCommentContent('   <b></b>   ')
    expect(result.valid).toBe(false)
  })

  it('rejects overly long comments', () => {
    const result = validateCommentContent('a'.repeat(1001))
    expect(result.valid).toBe(false)
  })
})
