'use client'

import Image from 'next/image'
import Link from 'next/link'

import { PlayButton } from '@/components/player/PlayButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PlayerSong } from '@/store/player'

import { AddToPlaylistButton } from './AddToPlaylistButton'
import { FavoriteButton } from './FavoriteButton'

interface SongCardSong {
  id: string
  title: string
  artistName: string
  albumName?: string | null
  duration?: number | null
  playCount: string | number | bigint
  coverFile?: { url: string } | null
  audioFile?: { url: string } | null
  category?: { name: string; slug: string } | null
  tags?: { tag: { name: string; slug: string } }[]
  user?: { username: string } | null
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatCount(count: string | number | bigint): string {
  const n = Number(count)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface SongCardProps {
  song: SongCardSong
  /** Full queue context for prev/next support */
  queue?: PlayerSong[]
  showFavorite?: boolean
  showAddToPlaylist?: boolean
}

export function SongCard({
  song,
  queue,
  showFavorite = true,
  showAddToPlaylist = true,
}: SongCardProps) {
  const playerSong: PlayerSong | null = song.audioFile?.url
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
    <Card className="group overflow-hidden transition-all hover:shadow-md hover:shadow-primary/10">
      <Link href={`/song/${song.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {song.coverFile?.url ? (
            <Image
              src={song.coverFile.url}
              alt={`${song.title} cover`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-12 w-12 text-muted-foreground/30"
              >
                <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
              </svg>
            </div>
          )}

          {/* Duration overlay */}
          {song.duration && (
            <div className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white/90 backdrop-blur-sm">
              {formatDuration(song.duration)}
            </div>
          )}

          {/* Play button overlay — only shown when audio is available */}
          {playerSong && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <PlayButton song={playerSong} queue={queue} size="md" />
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-3">
        <Link href={`/song/${song.id}`} className="block">
          <h3 className="truncate text-sm font-semibold leading-tight hover:text-primary">
            {song.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{song.artistName}</p>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {showFavorite && <FavoriteButton songId={song.id} size="sm" />}
            {showAddToPlaylist && <AddToPlaylistButton songId={song.id} size="sm" />}
          </div>
          {song.category ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {song.category.name}
            </Badge>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path d="M3 3.732a1.5 1.5 0 012.305-1.265l6.706 4.267a1.5 1.5 0 010 2.531l-6.706 4.268A1.5 1.5 0 013 12.267V3.732z" />
            </svg>
            {formatCount(song.playCount)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
