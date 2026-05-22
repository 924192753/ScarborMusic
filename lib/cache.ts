import { redis } from './redis'

// ─── Generic Cache Wrapper ────────────────────────────────────────────────────

/**
 * Fetch data from Redis cache or call the fetcher on a cache miss.
 * Silently falls back to the fetcher if Redis is unavailable.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached !== null) {
      return JSON.parse(cached) as T
    }
  } catch {
    // Redis unavailable — proceed to fetcher
  }

  const data = await fetcher()

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    // Silently ignore cache write errors
  }

  return data
}

/**
 * Delete a single cache key.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch {
    // Ignore
  }
}

// ─── Cache Key Builders ───────────────────────────────────────────────────────

export const CACHE_KEYS = {
  // Search
  searchSuggest: (q: string) => `search:suggest:${q.toLowerCase().trim()}`,

  // Charts
  charts: (type: 'all' | 'daily' | 'weekly' | 'monthly') => `charts:${type}`,

  // Discover
  discover: 'discover:data',
  hotSongs: 'songs:hot:top20',
  latestSongs: 'songs:latest:top20',
  hotPlaylists: 'playlists:hot:top6',
} as const

// ─── Charts Sorted Set Keys ───────────────────────────────────────────────────

function padded(n: number): string {
  return n.toString().padStart(2, '0')
}

export function getChartKeys(songId: string) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = padded(now.getUTCMonth() + 1)
  const d = padded(now.getUTCDate())

  // ISO week number
  const jan1 = new Date(Date.UTC(y, 0, 1))
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7)

  return {
    all: 'song:charts',
    daily: `song:charts:daily:${y}-${m}-${d}`,
    weekly: `song:charts:weekly:${y}-W${padded(week)}`,
    monthly: `song:charts:monthly:${y}-${m}`,
    songId,
  }
}
