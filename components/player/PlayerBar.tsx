'use client'

import Image from 'next/image'
import Link from 'next/link'

import { usePlayerStore } from '@/store/player'

import { PlayModeToggle } from './PlayModeToggle'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function PlayerBar() {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const speed = usePlayerStore((s) => s.speed)
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen)
  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const setSpeed = usePlayerStore((s) => s.setSpeed)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)

  if (!currentSong) return null

  function nextSpeed() {
    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number])
    const nextIdx = (idx + 1) % SPEEDS.length
    setSpeed(SPEEDS[nextIdx])
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-md">
      {/* Compact progress bar (top edge) */}
      <div className="h-1 w-full bg-muted">
        <ProgressBar showLabels={false} className="h-full" />
      </div>

      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4">
        {/* ── Left: Song Info ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Cover */}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm">
            {currentSong.coverUrl ? (
              <Image
                src={currentSong.coverUrl}
                alt={currentSong.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 text-muted-foreground/40"
                >
                  <path d="M15.75 2.25a.75.75 0 01.75.75v12.497a2.25 2.25 0 01-1.632 2.163l-.99.283a1.913 1.913 0 11-1.052-3.676l1.983-.567V8.246l-6.75 1.929v6.072a2.25 2.25 0 01-1.632 2.163l-.99.283a1.913 1.913 0 11-1.051-3.676l1.982-.567V3.75a.75.75 0 01.544-.721l9-2.572a.75.75 0 01.838.997v.796z" />
                </svg>
              </div>
            )}
          </div>
          {/* Title + Artist */}
          <div className="min-w-0">
            <Link
              href={`/song/${currentSong.id}`}
              className="block truncate text-sm font-medium hover:text-primary"
            >
              {currentSong.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{currentSong.artistName}</p>
          </div>
        </div>

        {/* ── Center: Playback Controls ────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              onClick={prev}
              aria-label="Previous"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M7.712 3.004a.75.75 0 01.738.863l-.748 4.498 1.523-1.023a.75.75 0 01.837 0l1.523 1.023L10.838 4a.75.75 0 01.738-.863A7.5 7.5 0 1115.75 10a.75.75 0 01-1.5 0 6 6 0 100-6.997zM7.5 12.25a.75.75 0 01.75.75v4.25a.75.75 0 01-1.5 0V13a.75.75 0 01.75-.75zM4 14a.75.75 0 01.75.75V17a.75.75 0 01-1.5 0v-2.25A.75.75 0 014 14z" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 translate-x-0.5"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              aria-label="Next"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M3 10a7.5 7.5 0 0013.75-4.093l.863-4.498A.75.75 0 0119.49 2a.75.75 0 01.738.863l-.748 4.498 1.523-1.023a.75.75 0 11.837 1.243l-3 2.016a.75.75 0 01-.837 0L14.5 7.58l.748-4.498A6 6 0 104.5 10a.75.75 0 01-1.5 0z" />
              </svg>
            </button>
          </div>

          {/* Full progress bar (desktop only) */}
          <div className="hidden w-64 md:block">
            <ProgressBar className="w-full" />
          </div>
        </div>

        {/* ── Right: Extra Controls ────────────────────────────────────────── */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Play Mode */}
          <PlayModeToggle className="hidden sm:flex" />

          {/* Speed */}
          <button
            onClick={nextSpeed}
            title={`Speed: ${speed}x`}
            aria-label={`Playback speed: ${speed}x`}
            className="hidden rounded px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
          >
            {speed}x
          </button>

          {/* Volume */}
          <VolumeControl className="hidden md:flex" />

          {/* Queue toggle */}
          <button
            onClick={toggleQueue}
            aria-label="Toggle queue"
            title="Play queue"
            className={`rounded p-1.5 transition-colors ${isQueueOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M2 4.5A2.5 2.5 0 014.5 2h11a2.5 2.5 0 010 5h-11A2.5 2.5 0 012 4.5zM2.75 9.083a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 12.663a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 16.25a.75.75 0 000 1.5H10a.75.75 0 000-1.5H2.75z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
