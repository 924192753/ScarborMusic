import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import type { PlayerSong } from '@/store/player'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Search` : 'Search',
    description: q
      ? `Search results for "${q}" on ScarborMusic`
      : 'Search for music on ScarborMusic',
  }
}

async function searchSongs(q: string, page: number, limit = 20) {
  if (!q.trim()) return { songs: [], total: 0, pages: 0 }
  const offset = (page - 1) * limit
  const base = { deletedAt: null, status: 'PUBLISHED' as const }
  const where = {
    ...base,
    OR: [
      { title: { contains: q } },
      { artistName: { contains: q } },
      { albumName: { contains: q } },
    ],
  }
  const [songs, total] = await Promise.all([
    prisma.song.findMany({
      where,
      select: {
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
      },
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.song.count({ where }),
  ])
  return { songs, total, pages: Math.ceil(total / limit) }
}

function formatDuration(s: number | null): string {
  if (!s) return '--:--'
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

// ─── Search Input (Client) ────────────────────────────────────────────────────

function SearchBarSection({ q }: { q: string }) {
  return (
    <form method="GET" action="/search" className="mb-6">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search songs, artists, albums…"
          autoFocus
          className="w-full rounded-xl border bg-muted/30 py-3 pl-12 pr-4 text-base outline-none ring-ring focus:ring-2"
        />
      </div>
    </form>
  )
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr))
  const { songs, total, pages } = await searchSongs(q, page)

  const playerQueue: PlayerSong[] = songs
    .filter((s) => s.audioFile?.url)
    .map((s) => ({
      id: s.id,
      title: s.title,
      artistName: s.artistName,
      audioUrl: s.audioFile!.url,
      coverUrl: s.coverFile?.url ?? null,
      duration: s.duration ?? null,
    }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SearchBarSection q={q} />

      {/* Results header */}
      {q && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} result${total !== 1 ? 's' : ''} for "${q}"`
              : `No results for "${q}"`}
          </p>
          {pages > 1 && (
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!q && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mb-4 h-12 w-12 text-muted-foreground/30"
          >
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-muted-foreground">Search for songs, artists, or albums</p>
        </div>
      )}

      {/* No results */}
      {q && total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No songs found for &ldquo;{q}&rdquo;</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different keyword or browse all songs
          </p>
          <Link href="/songs" className="mt-4 text-sm text-primary hover:underline">
            Browse Songs →
          </Link>
        </div>
      )}

      {/* Results list */}
      {songs.length > 0 && (
        <div className="space-y-1">
          {songs.map((song, idx) => {
            const pSong: PlayerSong | null = song.audioFile?.url
              ? {
                  id: song.id,
                  title: song.title,
                  artistName: song.artistName,
                  audioUrl: song.audioFile.url,
                  coverUrl: song.coverFile?.url ?? null,
                  duration: song.duration ?? null,
                }
              : null

            return (
              <div
                key={song.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="w-6 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
                  {pSong ? (
                    <>
                      <span className="hidden group-hover:inline-flex">
                        <PlayButton song={pSong} queue={playerQueue} size="sm" />
                      </span>
                      <span className="group-hover:hidden">{(page - 1) * 20 + idx + 1}</span>
                    </>
                  ) : (
                    <span>{(page - 1) * 20 + idx + 1}</span>
                  )}
                </span>

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
                    <div className="flex h-full items-center justify-center">
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

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/song/${song.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {song.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {song.artistName}
                    {song.albumName ? ` · ${song.albumName}` : ''}
                  </p>
                </div>

                {song.category && (
                  <Badge variant="secondary" className="hidden shrink-0 text-xs sm:flex">
                    {song.category.name}
                  </Badge>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDuration(song.duration)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
