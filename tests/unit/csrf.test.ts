import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'

import {
  applyCsrfCookie,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ensureCsrfCookieOnResponse,
  generateCsrfToken,
  isCsrfExemptPath,
  requiresCsrfValidation,
  validateCsrfToken,
} from '@/lib/csrf'

describe('csrf', () => {
  it('generates unique tokens', () => {
    const a = generateCsrfToken()
    const b = generateCsrfToken()
    expect(a).toHaveLength(64)
    expect(a).not.toBe(b)
  })

  it('exempts auth login/register/refresh', () => {
    expect(isCsrfExemptPath('/api/auth/login')).toBe(true)
    expect(isCsrfExemptPath('/api/auth/register')).toBe(true)
    expect(isCsrfExemptPath('/api/auth/refresh')).toBe(true)
    expect(isCsrfExemptPath('/api/auth/send-code')).toBe(false)
  })

  it('requires CSRF for unsafe API methods', () => {
    expect(requiresCsrfValidation('POST', '/api/comments')).toBe(true)
    expect(requiresCsrfValidation('GET', '/api/comments')).toBe(false)
    expect(requiresCsrfValidation('POST', '/api/auth/login')).toBe(false)
    expect(requiresCsrfValidation('DELETE', '/api/admin/users/1')).toBe(true)
  })

  it('validates matching cookie and header tokens', () => {
    const token = 'abc123'
    const request = new NextRequest('http://localhost/api/comments', {
      method: 'POST',
      headers: {
        cookie: `${CSRF_COOKIE_NAME}=${token}`,
        [CSRF_HEADER_NAME]: token,
      },
    })
    expect(validateCsrfToken(request)).toBe(true)
  })

  it('rejects missing or mismatched CSRF tokens', () => {
    const missing = new NextRequest('http://localhost/api/comments', { method: 'POST' })
    expect(validateCsrfToken(missing)).toBe(false)

    const mismatch = new NextRequest('http://localhost/api/comments', {
      method: 'POST',
      headers: {
        cookie: `${CSRF_COOKIE_NAME}=one`,
        [CSRF_HEADER_NAME]: 'two',
      },
    })
    expect(validateCsrfToken(mismatch)).toBe(false)
  })

  it('sets CSRF cookie on response when missing', () => {
    const request = new NextRequest('http://localhost/')
    const response = NextResponse.next()
    const updated = ensureCsrfCookieOnResponse(request, response)
    const cookie = updated.cookies.get(CSRF_COOKIE_NAME)
    expect(cookie?.value).toBeTruthy()
  })

  it('applyCsrfCookie sets token on response', () => {
    const response = NextResponse.next()
    applyCsrfCookie(response, 'test-token')
    expect(response.cookies.get(CSRF_COOKIE_NAME)?.value).toBe('test-token')
  })
})
