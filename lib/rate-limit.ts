import { type NextRequest } from 'next/server'

import { tooManyRequests } from '@/lib/api'
import { incrementCache } from '@/lib/redis'

export type RateLimitScope =
  | 'auth:login'
  | 'auth:register'
  | 'auth:send-code'
  | 'comments'
  | 'upload'

interface RateLimitPolicy {
  max: number
  windowSeconds: number
  keyPrefix: string
}

const POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  'auth:login': { max: 5, windowSeconds: 60, keyPrefix: 'rate:auth:login' },
  'auth:register': { max: 3, windowSeconds: 60 * 60, keyPrefix: 'rate:auth:register' },
  'auth:send-code': { max: 5, windowSeconds: 60 * 60, keyPrefix: 'rate:auth:send-code' },
  comments: { max: 20, windowSeconds: 60, keyPrefix: 'rate:comments' },
  upload: { max: 50, windowSeconds: 60 * 60, keyPrefix: 'rate:upload' },
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function buildRateLimitKey(scope: RateLimitScope, identifier: string): string {
  const policy = POLICIES[scope]
  return `${policy.keyPrefix}:${identifier}`
}

/**
 * Redis sliding-window counter rate limit.
 * Returns tooManyRequests response when exceeded, otherwise null.
 */
export async function enforceRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<ReturnType<typeof tooManyRequests> | null> {
  const policy = POLICIES[scope]
  const key = buildRateLimitKey(scope, identifier)

  try {
    const count = await incrementCache(key, policy.windowSeconds)
    if (count > policy.max) {
      return tooManyRequests('Too many requests')
    }
  } catch (error) {
    console.error(`[rate-limit] Redis unavailable for ${scope}:`, error)
    // Fail open when Redis is down to preserve availability
  }

  return null
}

export async function enforceRateLimitFromRequest(
  request: NextRequest,
  scope: RateLimitScope,
  identifier?: string,
): Promise<ReturnType<typeof tooManyRequests> | null> {
  const id = identifier ?? getClientIp(request)
  return enforceRateLimit(scope, id)
}

export function getRateLimitPolicy(scope: RateLimitScope): RateLimitPolicy {
  return POLICIES[scope]
}
