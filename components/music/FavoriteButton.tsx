'use client'

import { useEffect, useState } from 'react'

interface FavoriteButtonProps {
  songId: string
  initialFavorited?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function FavoriteButton({
  songId,
  initialFavorited,
  size = 'sm',
  className = '',
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited ?? false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(initialFavorited !== undefined)

  // Fetch initial state if not provided
  useEffect(() => {
    if (initialFavorited !== undefined) return
    fetch(`/api/favorites/${songId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setIsFavorited(d.data.isFavorited)
      })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [songId, initialFavorited])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    setLoading(true)
    const was = isFavorited
    setIsFavorited(!was) // optimistic

    try {
      const res = await fetch(was ? `/api/favorites/${songId}` : '/api/favorites', {
        method: was ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(was ? {} : { body: JSON.stringify({ songId }) }),
      })
      const d = await res.json()
      if (!d.success) {
        setIsFavorited(was) // revert
      }
    } catch {
      setIsFavorited(was)
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  if (!checked && initialFavorited === undefined) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex items-center justify-center rounded-full transition-all ${btnSize} ${
        isFavorited ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-400'
      } ${loading ? 'opacity-50' : ''} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={isFavorited ? 0 : 1.5}
        className={iconSize}
      >
        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-2.184C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.814l-.018.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
      </svg>
    </button>
  )
}
