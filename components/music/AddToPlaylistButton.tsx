'use client'

import { useEffect, useRef, useState } from 'react'

interface PlaylistOption {
  id: string
  name: string
  songCount: number
}

interface AddToPlaylistButtonProps {
  songId: string
  size?: 'sm' | 'md'
  className?: string
}

export function AddToPlaylistButton({
  songId,
  size = 'sm',
  className = '',
}: AddToPlaylistButtonProps) {
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/playlists?mine=true&pageSize=50')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlaylists(d.data.playlists)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function addToPlaylist(playlistId: string, playlistName: string) {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    const d = await res.json()
    if (d.success) {
      setAdded(playlistName)
      setTimeout(() => {
        setAdded(null)
        setOpen(false)
      }, 1500)
    }
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Add to playlist"
        title="Add to playlist"
        className={`flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground ${btnSize}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={iconSize}
        >
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1 z-50 w-52 rounded-lg border bg-popover shadow-xl">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
            Add to playlist
          </div>
          {added ? (
            <div className="px-3 py-2.5 text-xs text-green-600">
              {added ? <>✓ Added to &ldquo;{added}&rdquo;</> : null}
            </div>
          ) : loading ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">Loading…</div>
          ) : playlists.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">
              No playlists yet.{' '}
              <a href="/playlists" className="text-primary hover:underline">
                Create one
              </a>
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {playlists.map((pl) => (
                <li key={pl.id}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      addToPlaylist(pl.id, pl.name)
                    }}
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="block truncate font-medium">{pl.name}</span>
                    <span className="text-xs text-muted-foreground">{pl.songCount} songs</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
