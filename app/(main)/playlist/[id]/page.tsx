import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { prisma } from '@/lib/prisma'
import type { PlayerSong } from '@/store/player'

async function getPlaylist(id: string) {
  return prisma.playlist.findUnique({
    where: { id, deletedAt: null },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      coverFile: { select: { url: true } },
      songs: {
        where: { song: { deletedAt: null } },
        orderBy: { position: 'asc' },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artistName: true,
              albumName: true,
              duration: true,
              playCount: true,
              coverFile: { select: { url: true } },
              audioFile: { select: { url: true } },
            },
          },
        },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const pl = await getPlaylist(id)
  if (!pl || !pl.isPublic) return { title: 'Playlist' }
  return {
    title: pl.name,
    description: pl.description ?? `A playlist by ${pl.user.username} on ScarborMusic`,
    openGraph: {
      title: pl.name,
      description: pl.description ?? undefined,
      ...(pl.coverFile?.url && { images: [{ url: pl.coverFile.url }] }),
    },
  }
}

function formatDuration(s: number | null): string {
  if (!s) return '--:--'
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const playlist = await getPlaylist(id)

  if (!playlist || !playlist.isPublic) notFound()

  const playerQueue: PlayerSong[] = playlist.songs
    .filter((ps) => ps.song.audioFile?.url)
    .map((ps) => ({
      id: ps.song.id,
      title: ps.song.title,
      artistName: ps.song.artistName,
      audioUrl: ps.song.audioFile!.url,
      coverUrl: ps.song.coverFile?.url ?? null,
      duration: ps.song.duration,
    }))

  const totalDuration = playlist.songs.reduce((acc, ps) => acc + (ps.song.duration ?? 0), 0)
  const totalMin = Math.floor(totalDuration / 60)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="mx-auto h-48 w-48 shrink-0 sm:mx-0">
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted shadow-xl">
            {playlist.coverFile?.url ? (
              <Image
                src={playlist.coverFile.url}
                alt={playlist.name}
                fill
                sizes="192px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-16 w-16 text-primary/30"
                >
                  <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <Badge variant="secondary">
            {playlist.isPublic ? 'Public Playlist' : 'Private Playlist'}
          </Badge>
          <h1 className="text-3xl font-bold">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground">{playlist.description}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              By{' '}
              <Link
                href={`/user/${playlist.user.id}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {playlist.user.username}
              </Link>
            </span>
            <span>·</span>
            <span>{playlist.songs.length} songs</span>
            {totalMin > 0 && (
              <>
                <span>·</span>
                <span>~{totalMin} min</span>
              </>
            )}
          </div>
          {playerQueue.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <PlayButton song={playerQueue[0]} queue={playerQueue} size="lg" />
              <span className="text-sm text-muted-foreground">Play all</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Song list */}
      {playlist.songs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">This playlist has no songs yet.</p>
      ) : (
        <div className="space-y-1">
          {playlist.songs.map((ps, idx) => {
            const song = ps.song
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

            return (
              <div
                key={song.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="w-5 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
                  {pSong ? (
                    <span className="hidden group-hover:block">
                      <PlayButton song={pSong} queue={playerQueue} size="sm" />
                    </span>
                  ) : null}
                  <span className={pSong ? 'group-hover:hidden' : ''}>{idx + 1}</span>
                </span>
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                  {song.coverFile?.url ? (
                    <Image
                      src={song.coverFile.url}
                      alt={song.title}
                      fill
                      sizes="36px"
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
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/song/${song.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {song.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{song.artistName}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDuration(song.duration)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
