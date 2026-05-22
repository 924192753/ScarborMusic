'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { PlayButton } from '@/components/player/PlayButton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { usePlayerStore } from '@/store/player'
import type { PlayerSong } from '@/store/player'

interface FavoriteSong {
  id: string
  title: string
  artistName: string
  albumName: string | null
  duration: number | null
  playCount: string
  coverFile: { url: string } | null
  audioFile: { url: string } | null
  category: { name: string } | null
}

interface FavoriteEntry {
  id: string
  createdAt: string
  song: FavoriteSong
}

function formatDuration(s: number | null): string {
  if (!s) return '--:--'
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const setSong = usePlayerStore((s) => s.setSong)

  useEffect(() => {
    fetch('/api/favorites?pageSize=100')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFavorites(d.data.favorites)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const playerQueue: PlayerSong[] = favorites
    .filter((f) => f.song.audioFile?.url)
    .map((f) => ({
      id: f.song.id,
      title: f.song.title,
      artistName: f.song.artistName,
      audioUrl: f.song.audioFile!.url,
      coverUrl: f.song.coverFile?.url ?? null,
      duration: f.song.duration,
    }))

  async function handleUnfavorite(songId: string) {
    const res = await fetch(`/api/favorites/${songId}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.success) setFavorites((prev) => prev.filter((f) => f.song.id !== songId))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Favorites</h1>
          <p className="mt-1 text-sm text-muted-foreground">{favorites.length} saved songs</p>
        </div>
        {playerQueue.length > 0 && (
          <Button size="sm" onClick={() => setSong(playerQueue[0], playerQueue)}>
            ▶ Play All
          </Button>
        )}
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mb-4 h-12 w-12 text-muted-foreground/30"
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <p className="text-muted-foreground">No favorites yet.</p>
          <Link href="/songs" className="mt-2">
            <Button variant="outline" size="sm">
              Browse Songs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {favorites.map((fav, idx) => {
            const song = fav.song
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
                key={fav.id}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="w-5 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
                  {pSong ? (
                    <>
                      <span className="hidden group-hover:inline-flex">
                        <PlayButton song={pSong} queue={playerQueue} size="sm" />
                      </span>
                      <span className="group-hover:hidden">{idx + 1}</span>
                    </>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
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

                {song.category && (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {song.category.name}
                  </span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDuration(song.duration)}
                </span>

                {/* Unfavorite button */}
                <button
                  onClick={() => handleUnfavorite(song.id)}
                  aria-label="Remove from favorites"
                  className="shrink-0 rounded p-1 text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-2.184C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.814l-.018.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
