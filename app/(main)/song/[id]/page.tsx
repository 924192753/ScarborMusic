import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { prisma } from '@/lib/prisma'
import type { PlayerSong } from '@/store/player'

// ─── Data Fetching ────────────────────────────────────────────────────────────

const SONG_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
  coverFile: { select: { url: true } },
  audioFile: { select: { id: true, url: true } },
  user: { select: { id: true, username: true, avatarUrl: true } },
} as const

async function getSong(id: string) {
  return prisma.song.findUnique({
    where: { id, deletedAt: null },
    include: SONG_INCLUDE,
  })
}

// ─── Convert to PlayerSong ───────────────────────────────────────────────────

function toPlayerSong(song: NonNullable<Awaited<ReturnType<typeof getSong>>>): PlayerSong {
  return {
    id: song.id,
    title: song.title,
    artistName: song.artistName,
    audioUrl: song.audioFile?.url ?? '',
    coverUrl: song.coverFile?.url ?? null,
    duration: song.duration,
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const song = await getSong(id)
  if (!song) return { title: 'Song not found' }

  const title = `${song.title} — ${song.artistName}`
  const description =
    song.description ??
    `Listen to ${song.title} by ${song.artistName}${song.albumName ? ` from ${song.albumName}` : ''} on ScarborMusic.`

  return {
    title,
    description,
    openGraph: {
      type: 'music.song',
      title,
      description,
      ...(song.coverFile?.url && {
        images: [{ url: song.coverFile.url, width: 800, height: 800, alt: song.title }],
      }),
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'Unknown'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatCount(n: bigint | number): string {
  const num = Number(n)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await getSong(id)

  if (!song || song.status === 'HIDDEN') notFound()

  const playerSong = toPlayerSong(song)

  // Fetch a few more songs from the same category for the queue
  let relatedSongs: PlayerSong[] = []
  if (song.categoryId) {
    const related = await prisma.song.findMany({
      where: {
        categoryId: song.categoryId,
        status: 'PUBLISHED',
        deletedAt: null,
        id: { not: song.id },
      },
      take: 9,
      include: { audioFile: { select: { url: true } }, coverFile: { select: { url: true } } },
    })
    relatedSongs = related
      .filter((s) => s.audioFile?.url)
      .map((s) => ({
        id: s.id,
        title: s.title,
        artistName: s.artistName,
        audioUrl: s.audioFile!.url,
        coverUrl: s.coverFile?.url ?? null,
        duration: s.duration,
      }))
  }

  const fullQueue: PlayerSong[] = [playerSong, ...relatedSongs]

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: song.artistName },
    ...(song.albumName && { inAlbum: { '@type': 'MusicAlbum', name: song.albumName } }),
    ...(song.duration && {
      duration: `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S`,
    }),
    ...(song.coverFile?.url && { image: song.coverFile.url }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-8 sm:flex-row">
          {/* Cover Art */}
          <div className="mx-auto w-60 shrink-0 sm:mx-0 sm:w-72">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted shadow-2xl shadow-black/20">
              {song.coverFile?.url ? (
                <Image
                  src={song.coverFile.url}
                  alt={`${song.title} cover`}
                  fill
                  sizes="(max-width: 640px) 240px, 288px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-20 w-20 text-muted-foreground/20"
                  >
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4">
            <div>
              {song.category && (
                <Link href={`/songs?categoryId=${song.category.id}`}>
                  <Badge variant="secondary" className="mb-2">
                    {song.category.name}
                  </Badge>
                </Link>
              )}
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{song.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{song.artistName}</p>
              {song.albumName && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Album: <span className="text-foreground">{song.albumName}</span>
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3 3.732a1.5 1.5 0 012.305-1.265l6.706 4.267a1.5 1.5 0 010 2.531l-6.706 4.268A1.5 1.5 0 013 12.267V3.732z" />
                </svg>
                {formatCount(song.playCount)} plays
              </span>
              {song.duration && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M1 8a7 7 0 1114 0A7 7 0 011 8zm7-4.75a.75.75 0 01.75.75v3.69l2.03 2.03a.75.75 0 01-1.06 1.06l-2.25-2.25a.75.75 0 01-.22-.53V4a.75.75 0 01.75-.75z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {formatDuration(song.duration)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-muted-foreground">
                By{' '}
                <Link
                  href={`/user/${song.user.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {song.user.username}
                </Link>
              </span>
            </div>

            {/* Tags */}
            {song.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {song.tags.map(({ tag }) => (
                  <Link key={tag.id} href={`/songs?tagId=${tag.id}`}>
                    <Badge variant="outline" className="text-xs">
                      #{tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Play Controls */}
            {song.audioFile?.url ? (
              <div className="flex items-center gap-3 pt-2">
                <PlayButton song={playerSong} queue={fullQueue} size="lg" />
                <div>
                  <p className="text-sm font-medium">Play Now</p>
                  <p className="text-xs text-muted-foreground">
                    {fullQueue.length > 1 && `${fullQueue.length} songs in queue`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Audio not available</p>
            )}
          </div>
        </div>

        {/* Description */}
        {song.description && (
          <>
            <Separator className="my-8" />
            <section>
              <h2 className="mb-3 text-lg font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {song.description}
              </p>
            </section>
          </>
        )}

        {/* Lyrics */}
        {song.lyrics && (
          <>
            <Separator className="my-8" />
            <section>
              <h2 className="mb-3 text-lg font-semibold">Lyrics</h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {song.lyrics}
              </pre>
            </section>
          </>
        )}
      </div>
    </>
  )
}
