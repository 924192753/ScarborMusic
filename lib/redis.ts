import Redis from 'ioredis'

// Persist the Redis connection across Next.js hot reloads
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
    lazyConnect: false,
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  client.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Redis] Connected')
    }
  })

  return client
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

/**
 * Set a cache entry with an optional TTL in seconds.
 */
export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds !== undefined) {
    await redis.setex(key, ttlSeconds, value)
  } else {
    await redis.set(key, value)
  }
}

/**
 * Get a cached value by key. Returns null if the key does not exist.
 */
export async function getCache(key: string): Promise<string | null> {
  return redis.get(key)
}

/**
 * Delete one or more cache keys.
 */
export async function deleteCache(...keys: string[]): Promise<void> {
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

/**
 * Increment a counter atomically and optionally set TTL on first creation.
 * Used for rate limiting.
 */
export async function incrementCache(key: string, ttlSeconds?: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1 && ttlSeconds !== undefined) {
    await redis.expire(key, ttlSeconds)
  }
  return count
}

// ─── Key Builders ─────────────────────────────────────────────────────────────

export const CacheKeys = {
  emailCode: (email: string, type: string) => `email:code:${type}:${email}`,
  refreshTokenBlacklist: (jti: string) => `auth:blacklist:${jti}`,
  rateLimitSendCode: (ip: string) => `rate:send-code:${ip}`,
  rateLimitLogin: (ip: string) => `rate:login:${ip}`,
} as const
