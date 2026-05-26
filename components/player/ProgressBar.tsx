'use client'

import { useCallback } from 'react'

import { usePlayerStore } from '@/store/player'

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface ProgressBarProps {
  /** Show time labels (current / duration). Default: true */
  showLabels?: boolean
  className?: string
}

export function ProgressBar({ showLabels = true, className = '' }: ProgressBarProps) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const seek = usePlayerStore((s) => s.seek)

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      seek(Number(e.target.value))
    },
    [seek],
  )

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)}
        </span>
      )}

      <div className="group relative flex-1">
        {/* Track background */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          {/* Filled portion */}
          <div
            className="h-full rounded-full bg-primary transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Invisible range input on top for interaction */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          onChange={handleChange}
          aria-label="Seek"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        {/* Thumb indicator (visible on hover) */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>

      {showLabels && (
        <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTime(duration)}
        </span>
      )}
    </div>
  )
}
