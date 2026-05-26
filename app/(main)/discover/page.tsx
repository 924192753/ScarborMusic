import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { SongCard } from '@/components/music/SongCard'
import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CACHE_KEYS, getChartKeys, withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import type { PlayerSong } from '@/store/player'

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Discover hot and new music on ScarborMusic',
}

export const revalidate = 60

const SONG_INCLUDE = {
  coverFile: { select: { url: true } },
  audioFile: { select: { url: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  user: { select: { id: true, username: true } },
} as const

function formatCount(n: number | bigint): string {
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

async function getDiscoverData() {
  const chartKeys = getChartKeys('')

  const [latestSongs, hotPlaylists, topChartIds] = await Promise.all([
    // Latest 8 songs
    prisma.song.findMany({
      where: { deletedAt: null, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: SONG_INCLUDE,
    }),
    // Hot playlists by songCount
    prisma.playlist.findMany({
      where: { deletedAt: null, isPublic: true, songCount: { gt: 0 } },
      orderBy: { songCount: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        songCount: true,
        coverFile: { select: { url: true } },
        user: { select: { username: true } },
      },
    }),
    // Top 10 from Redis charts
    redis.zrevrange(chartKeys.all, 0, 9).catch(() => [] as string[]),
  ])

  // Fetch hot songs from chart IDs or DB fallback
  const hotSongs = await withCache(CACHE_KEYS.hotSongs, 60, async () => {
    if (topChartIds.length > 0) {
      const songs = await prisma.song.findMany({
        where: { id: { in: topChartIds }, deletedAt: null, status: 'PUBLISHED' },
        include: SONG_INCLUDE,
      })
      // Sort by chart order
      const map = new Map(songs.map((s) => [s.id, s]))
      return topChartIds.filter((id) => map.has(id)).map((id) => map.get(id)!)
    }
    return prisma.song.findMany({
      where: { deletedAt: null, status: 'PUBLISHED' },
      orderBy: { playCount: 'desc' },
      take: 8,
      include: SONG_INCLUDE,
    })
  })

  return { latestSongs, hotSongs, hotPlaylists }
}

export default async function DiscoverPage() {
  const { latestSongs, hotSongs, hotPlaylists } = await getDiscoverData()

  function toPlayerSong(s: (typeof latestSongs)[0]): PlayerSong | null {
    if (!s.audioFile?.url) return null
    return {
      id: s.id,
      title: s.title,
      artistName: s.artistName,
      audioUrl: s.audioFile.url,
      coverUrl: s.coverFile?.url ?? null,
      duration: s.duration ?? null,
    }
  }

  const hotQueue = hotSongs
    .filter((s) => s.audioFile?.url)
    .map(toPlayerSong)
    .filter(Boolean) as PlayerSong[]
  const latestQueue = latestSongs
    .filter((s) => s.audioFile?.url)
    .map(toPlayerSong)
    .filter(Boolean) as PlayerSong[]

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      {/* Hero — Featured Song */}
      {hotSongs[0] && (
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:h-36 sm:w-36">
                {hotSongs[0].coverFile?.url ? (
                  <Image
                    src={hotSongs[0].coverFile.url}
                    alt={hotSongs[0].title}
                    fill
                    sizes="144px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-10 w-10 text-primary/50"
                    >
                      <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  🔥 Trending
                </Badge>
                <h2 className="text-2xl font-bold sm:text-3xl">{hotSongs[0].title}</h2>
                <p className="text-muted-foreground">{hotSongs[0].artistName}</p>
                <div className="flex items-center gap-3 pt-1">
                  {toPlayerSong(hotSongs[0]) && (
                    <PlayButton song={toPlayerSong(hotSongs[0])!} queue={hotQueue} size="lg" />
                  )}
                  <Link
                    href={`/song/${hotSongs[0].id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hot Right Now */}
      {hotSongs.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">🔥 Hot Right Now</h2>
            <Link href="/charts" className="text-sm text-primary hover:underline">
              See charts →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {hotSongs.slice(0, 8).map((song) => (
              <SongCard
                key={song.id}
                song={{ ...song, playCount: song.playCount.toString() }}
                queue={hotQueue}
              />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {latestSongs.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">✨ New Arrivals</h2>
            <Link href="/songs?sort=latest" className="text-sm text-primary hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {latestSongs.slice(0, 8).map((song) => (
              <SongCard
                key={song.id}
                song={{ ...song, playCount: song.playCount.toString() }}
                queue={latestQueue}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular Playlists */}
      {hotPlaylists.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">🎵 Popular Playlists</h2>
            <Link href="/playlists" className="text-sm text-primary hover:underline">
              Browse →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {hotPlaylists.map((pl) => (
              <Card key={pl.id} className="group overflow-hidden transition-all hover:shadow-md">
                <Link href={`/playlist/${pl.id}`}>
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {pl.coverFile?.url ? (
                      <Image
                        src={pl.coverFile.url}
                        alt={pl.name}
                        fill
                        sizes="200px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-10 w-10 text-primary/30"
                        >
                          <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-3">
                  <Link
                    href={`/playlist/${pl.id}`}
                    className="block truncate text-sm font-semibold hover:text-primary"
                  >
                    {pl.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {pl.songCount} songs · {pl.user.username}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Charts Top 10 Preview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">🏆 Top Charts</h2>
          <Link href="/charts" className="text-sm text-primary hover:underline">
            Full charts →
          </Link>
        </div>
        <div className="space-y-1">
          {hotSongs.slice(0, 10).map((song, idx) => {
            const pSong = toPlayerSong(song)
            return (
              <div
                key={song.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
              >
                <span
                  className={`w-6 shrink-0 text-center text-sm font-bold tabular-nums ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}
                >
                  {pSong ? (
                    <>
                      <span className="hidden group-hover:inline-flex">
                        <PlayButton song={pSong} queue={hotQueue} size="sm" />
                      </span>
                      <span className="group-hover:hidden">{idx + 1}</span>
                    </>
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {song.coverFile?.url && (
                    <Image
                      src={song.coverFile.url}
                      alt={song.title}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/song/${song.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {song.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{song.artistName}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatCount(song.playCount)}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
