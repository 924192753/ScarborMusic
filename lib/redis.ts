import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function isNextProductionBuild(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'
  )
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
  const building = isNextProductionBuild()

  const client = new Redis(url, {
    // Docker `next build` has no Redis — connect only on first command at runtime
    lazyConnect: true,
    maxRetriesPerRequest: building ? 0 : 3,
    enableReadyCheck: !building,
    retryStrategy(times) {
      if (building) return null
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
  })

  client.on('error', (err) => {
    if (!building) {
      console.error('[Redis] Connection error:', err.message)
    }
  })

  if (!building) {
    client.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Redis] Connected')
      }
    })
  }

  return client
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds !== undefined) {
    await redis.setex(key, ttlSeconds, value)
  } else {
    await redis.set(key, value)
  }
}

export async function getCache(key: string): Promise<string | null> {
  return redis.get(key)
}

export async function deleteCache(...keys: string[]): Promise<void> {
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

export async function incrementCache(key: string, ttlSeconds?: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1 && ttlSeconds !== undefined) {
    await redis.expire(key, ttlSeconds)
  }
  return count
}

export const CacheKeys = {
  emailCode: (email: string, type: string) => `email:code:${type}:${email}`,
  refreshTokenBlacklist: (jti: string) => `auth:blacklist:${jti}`,
  rateLimitSendCode: (ip: string) => `rate:send-code:${ip}`,
  rateLimitLogin: (ip: string) => `rate:login:${ip}`,
} as const
