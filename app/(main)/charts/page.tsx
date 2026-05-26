import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { CACHE_KEYS, getChartKeys, withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import type { PlayerSong } from '@/store/player'

export const metadata: Metadata = {
  title: 'Charts',
  description: 'Top songs on ScarborMusic ranked by plays',
}

export const revalidate = 60

const SONG_SELECT = {
  id: true,
  title: true,
  artistName: true,
  albumName: true,
  duration: true,
  playCount: true,
  coverFile: { select: { url: true } },
  audioFile: { select: { url: true } },
  category: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, username: true } },
} as const

type ChartType = 'all' | 'daily' | 'weekly' | 'monthly'

interface ChartEntry {
  rank: number
  score: number
  song: {
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
  }
}

async function getCharts(type: ChartType, limit = 50): Promise<ChartEntry[]> {
  const cacheKey = CACHE_KEYS.charts(type)
  const chartKeys = getChartKeys('')

  return withCache(cacheKey, 5 * 60, async () => {
    const redisKey =
      type === 'all'
        ? chartKeys.all
        : type === 'daily'
          ? chartKeys.daily
          : type === 'weekly'
            ? chartKeys.weekly
            : chartKeys.monthly

    const entries: { songId: string; score: number }[] = []
    try {
      const raw = await redis.zrevrange(redisKey, 0, limit - 1, 'WITHSCORES')
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ songId: raw[i], score: Number(raw[i + 1]) })
      }
    } catch {
      /* fallback to DB */
    }

    if (entries.length > 0) {
      const songs = await prisma.song.findMany({
        where: { id: { in: entries.map((e) => e.songId) }, deletedAt: null, status: 'PUBLISHED' },
        select: SONG_SELECT,
      })
      const songMap = new Map(songs.map((s) => [s.id, s]))
      return entries
        .filter((e) => songMap.has(e.songId))
        .map((e, idx) => ({
          rank: idx + 1,
          score: e.score,
          song: {
            ...songMap.get(e.songId)!,
            playCount: songMap.get(e.songId)!.playCount.toString(),
          },
        }))
    }

    const dbSongs = await prisma.song.findMany({
      where: { deletedAt: null, status: 'PUBLISHED' },
      select: SONG_SELECT,
      orderBy: { playCount: 'desc' },
      take: limit,
    })
    return dbSongs.map((s, idx) => ({
      rank: idx + 1,
      score: Number(s.playCount),
      song: { ...s, playCount: s.playCount.toString() },
    }))
  })
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
]

export default async function ChartsPage({ searchParams }: PageProps) {
  const { type: typeParam = 'all' } = await searchParams
  const type = (
    ['all', 'daily', 'weekly', 'monthly'].includes(typeParam) ? typeParam : 'all'
  ) as ChartType

  const charts = await getCharts(type)

  const playerQueue: PlayerSong[] = charts
    .filter((e) => e.song.audioFile?.url)
    .map((e) => ({
      id: e.song.id,
      title: e.song.title,
      artistName: e.song.artistName,
      audioUrl: e.song.audioFile!.url,
      coverUrl: e.song.coverFile?.url ?? null,
      duration: e.song.duration,
    }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Charts</h1>
        <p className="mt-1 text-muted-foreground">Top songs ranked by plays</p>
      </div>

      {/* Type selector */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CHART_TYPES.map(({ value, label }) => (
          <Link
            key={value}
            href={`/charts?type=${value}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === value
                ? 'bg-primary text-primary-foreground'
                : 'border text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <p className="text-muted-foreground">No chart data yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start playing songs to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {charts.map((entry) => {
            const song = entry.song
            const pSong: PlayerSong | null = song.audioFile?.url
              ? {
                  id: song.id,
                  title: song.title,
                  artistName: song.artistName,
                  audioUrl: song.audioFile.url,
                  coverUrl: song.coverFile?.url ?? null,
                  duration: song.duration,
                }
              : null

            const rankColor =
              entry.rank === 1
                ? 'text-yellow-500'
                : entry.rank === 2
                  ? 'text-slate-400'
                  : entry.rank === 3
                    ? 'text-amber-600'
                    : 'text-muted-foreground'

            return (
              <div
                key={song.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                {/* Rank */}
                <span
                  className={`w-7 shrink-0 text-center text-sm font-bold tabular-nums ${rankColor}`}
                >
                  {pSong ? (
                    <>
                      <span className="hidden group-hover:inline-flex">
                        <PlayButton song={pSong} queue={playerQueue} size="sm" />
                      </span>
                      <span className="group-hover:hidden">{entry.rank}</span>
                    </>
                  ) : (
                    <span>{entry.rank}</span>
                  )}
                </span>

                {/* Cover */}
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {song.coverFile?.url ? (
                    <Image
                      src={song.coverFile.url}
                      alt={song.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 text-muted-foreground/30"
                      >
                        <path d="M13 3.37A1 1 0 0011.27 2.5l-6.75 1.929A1 1 0 003.5 5.38v8.12a1.5 1.5 0 001.09 2.163l.99.283A1.275 1.275 0 107.25 14.25V8.77l6.75-1.93v4.663a1.5 1.5 0 001.09 2.163l.99.283A1.275 1.275 0 1017.25 12.25V5.38a1 1 0 00-.75-.966L13 3.37z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/song/${song.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {song.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{song.artistName}</p>
                </div>

                {song.category && (
                  <Badge variant="secondary" className="hidden shrink-0 text-xs sm:flex">
                    {song.category.name}
                  </Badge>
                )}

                {/* Plays */}
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path d="M3 3.732a1.5 1.5 0 012.305-1.265l6.706 4.267a1.5 1.5 0 010 2.531l-6.706 4.268A1.5 1.5 0 013 12.267V3.732z" />
                  </svg>
                  {formatCount(entry.score || Number(song.playCount))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
