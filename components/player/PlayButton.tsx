'use client'

import { type PlayerSong, usePlayerStore } from '@/store/player'

interface PlayButtonProps {
  song: PlayerSong
  /** Optional surrounding queue for prev/next navigation */
  queue?: PlayerSong[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Show "Add to queue" instead of replacing queue */
  addOnly?: boolean
}

/**
 * Client component play button.
 * Can be dropped into any server-rendered page by passing song data as props.
 */
export function PlayButton({
  song,
  queue,
  size = 'md',
  className = '',
  addOnly = false,
}: PlayButtonProps) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setSong = usePlayerStore((s) => s.setSong)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const toggle = usePlayerStore((s) => s.toggle)

  const isCurrentSong = currentSong?.id === song.id
  const isThisPlaying = isCurrentSong && isPlaying

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  const btnSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (addOnly) {
      addToQueue(song)
      return
    }

    if (isCurrentSong) {
      toggle()
    } else {
      setSong(song, queue)
    }
  }

  if (addOnly) {
    return (
      <button
        onClick={handleClick}
        aria-label="Add to queue"
        title="Add to queue"
        className={`flex items-center justify-center rounded-full bg-muted text-foreground transition-all hover:bg-muted/80 ${btnSize} ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={iconSize}
        >
          <path d="M2 4.5A2.5 2.5 0 014.5 2h11a2.5 2.5 0 010 5h-11A2.5 2.5 0 012 4.5zM2.75 9.083a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 12.663a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 16.25a.75.75 0 000 1.5H10a.75.75 0 000-1.5H2.75z" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isThisPlaying ? 'Pause' : 'Play'}
      title={isThisPlaying ? 'Pause' : 'Play'}
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 ${btnSize} ${className}`}
    >
      {isThisPlaying ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={iconSize}
        >
          <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`${iconSize} translate-x-0.5`}
        >
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
      )}
    </button>
  )
}
