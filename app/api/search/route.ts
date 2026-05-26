import { type NextRequest } from 'next/server'

import { badRequest, handleApiError, ok } from '@/lib/api'
import { prisma } from '@/lib/prisma'

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  albumName: true,
  duration: true,
  playCount: true,
  status: true,
  createdAt: true,
  coverFile: { select: { url: true } },
  audioFile: { select: { url: true } },
  category: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, username: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim() ?? ''
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))

    if (q.length < 1) {
      return badRequest('Search query must be at least 1 character')
    }

    const offset = (page - 1) * limit
    const baseWhere = { deletedAt: null, status: 'PUBLISHED' as const }

    // Hybrid search: Full-text (MATCH...AGAINST) with LIKE fallback
    // Single-word queries < 3 chars can't use FULLTEXT in MySQL default config
    let songs: Array<{
      id: string
      title: string
      artistName: string
      albumName: string | null
      duration: number | null
      playCount: string
      coverFile: { url: string } | null
      audioFile: { url: string } | null
      category: { id: number; name: string; slug: string } | null
      user: { id: string; username: string }
    }> = []
    let total = 0

    if (q.length >= 3) {
      // Try FULLTEXT search first
      try {
        const booleanQuery = q
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => `${w}*`)
          .join(' ')

        type RawSong = {
          id: string
          title: string
          artist_name: string
          album_name: string | null
          duration: number | null
          play_count: bigint
          cover_url: string | null
          audio_url: string | null
          category_id: number | null
          category_name: string | null
          category_slug: string | null
          user_id: string
          username: string
          relevance: number
        }

        const [rawSongs, countRows] = await Promise.all([
          prisma.$queryRaw<RawSong[]>`
            SELECT
              s.id, s.title, s.artist_name, s.album_name, s.duration, s.play_count,
              cf.url AS cover_url, af.url AS audio_url,
              s.category_id, cat.name AS category_name, cat.slug AS category_slug,
              s.user_id, u.username,
              MATCH(s.title, s.artist_name, s.album_name) AGAINST (${q} IN BOOLEAN MODE) AS relevance
            FROM songs s
            LEFT JOIN uploaded_files cf ON s.cover_file_id = cf.id
            LEFT JOIN uploaded_files af ON s.audio_file_id = af.id
            LEFT JOIN categories cat ON s.category_id = cat.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.deleted_at IS NULL
              AND s.status = 'PUBLISHED'
              AND MATCH(s.title, s.artist_name, s.album_name) AGAINST (${booleanQuery} IN BOOLEAN MODE)
            ORDER BY relevance DESC, s.play_count DESC
            LIMIT ${limit} OFFSET ${offset}
          `,
          prisma.$queryRaw<{ total: bigint }[]>`
            SELECT COUNT(*) AS total
            FROM songs s
            WHERE s.deleted_at IS NULL
              AND s.status = 'PUBLISHED'
              AND MATCH(s.title, s.artist_name, s.album_name) AGAINST (${booleanQuery} IN BOOLEAN MODE)
          `,
        ])

        total = Number(countRows[0]?.total ?? 0)

        songs = rawSongs.map((r) => ({
          id: r.id,
          title: r.title,
          artistName: r.artist_name,
          albumName: r.album_name,
          duration: r.duration,
          playCount: r.play_count.toString(),
          coverFile: r.cover_url ? { url: r.cover_url } : null,
          audioFile: r.audio_url ? { url: r.audio_url } : null,
          category: r.category_id
            ? { id: r.category_id, name: r.category_name!, slug: r.category_slug! }
            : null,
          user: { id: r.user_id, username: r.username },
        }))

        // If FULLTEXT returns 0, fall through to LIKE
        if (total > 0) {
          return ok({
            songs,
            total,
            page,
            pages: Math.ceil(total / limit),
          })
        }
      } catch {
        // FULLTEXT not available, fall through to LIKE
      }
    }

    // LIKE fallback (also handles short queries < 3 chars)
    const [likeResults, likeCount] = await Promise.all([
      prisma.song.findMany({
        where: {
          ...baseWhere,
          OR: [
            { title: { contains: q } },
            { artistName: { contains: q } },
            { albumName: { contains: q } },
          ],
        },
        select: SONG_SELECT,
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.song.count({
        where: {
          ...baseWhere,
          OR: [
            { title: { contains: q } },
            { artistName: { contains: q } },
            { albumName: { contains: q } },
          ],
        },
      }),
    ])

    return ok({
      songs: likeResults.map((s) => ({ ...s, playCount: s.playCount.toString() })),
      total: likeCount,
      page,
      pages: Math.ceil(likeCount / limit),
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/search')
  }
}
