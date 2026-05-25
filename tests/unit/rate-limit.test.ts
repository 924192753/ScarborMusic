import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as redisModule from '@/lib/redis'
import {
  enforceRateLimit,
  enforceRateLimitFromRequest,
  getClientIp,
  getRateLimitPolicy,
} from '@/lib/rate-limit'

vi.mock('@/lib/redis', () => ({
  incrementCache: vi.fn(),
}))

describe('rate-limit', () => {
  beforeEach(() => {
    vi.mocked(redisModule.incrementCache).mockReset()
  })

  it('extracts client IP from x-forwarded-for', () => {
    const request = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('returns null when under limit', async () => {
    vi.mocked(redisModule.incrementCache).mockResolvedValue(1)
    const result = await enforceRateLimit('auth:login', '1.2.3.4')
    expect(result).toBeNull()
  })

  it('returns 429 when over limit', async () => {
    vi.mocked(redisModule.incrementCache).mockResolvedValue(6)
    const result = await enforceRateLimit('auth:login', '1.2.3.4')
    expect(result?.status).toBe(429)
    const body = await result?.json()
    expect(body.message).toBe('Too many requests')
  })

  it('fails open when Redis throws', async () => {
    vi.mocked(redisModule.incrementCache).mockRejectedValue(new Error('redis down'))
    const result = await enforceRateLimit('auth:login', '1.2.3.4')
    expect(result).toBeNull()
  })

  it('uses request IP by default', async () => {
    vi.mocked(redisModule.incrementCache).mockResolvedValue(1)
    const request = new NextRequest('http://localhost', {
      headers: { 'x-forwarded-for': '198.51.100.1' },
    })
    await enforceRateLimitFromRequest(request, 'auth:register')
    expect(redisModule.incrementCache).toHaveBeenCalledWith(
      'rate:auth:register:198.51.100.1',
      3600,
    )
  })

  it('defines policies', () => {
    expect(getRateLimitPolicy('auth:send-code').max).toBe(5)
    expect(getRateLimitPolicy('comments').max).toBe(20)
    expect(getRateLimitPolicy('upload').max).toBe(50)
  })
})
