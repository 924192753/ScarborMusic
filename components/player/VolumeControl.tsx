'use client'

import { usePlayerStore } from '@/store/player'

export function VolumeControl({ className = '' }: { className?: string }) {
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  const displayVolume = isMuted ? 0 : volume

  function VolumeIcon() {
    if (displayVolume === 0) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M9.547 3.062A.75.75 0 0110 3.75v12.5a.75.75 0 01-1.264.546L4.703 13H3.167a.75.75 0 01-.7-.48A6.985 6.985 0 012 10c0-.887.165-1.737.468-2.52a.75.75 0 01.699-.48h1.536l4.033-3.296a.75.75 0 01.811-.142zM13.78 7.22a.75.75 0 10-1.06 1.06L14.44 10l-1.72 1.72a.75.75 0 001.06 1.06L15.5 11.06l1.72 1.72a.75.75 0 101.06-1.06L16.56 10l1.72-1.72a.75.75 0 00-1.06-1.06L15.5 8.94l-1.72-1.72z" />
        </svg>
      )
    }
    if (displayVolume < 0.5) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.548 5.452a.75.75 0 10-1.06 1.061 5.5 5.5 0 010 6.975.75.75 0 101.06 1.06 7 7 0 000-9.096z" />
        </svg>
      )
    }
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.548 5.452a.75.75 0 10-1.06 1.061 5.5 5.5 0 010 6.975.75.75 0 101.06 1.06 7 7 0 000-9.096zM13.428 7.573a.75.75 0 10-1.061 1.06 2.5 2.5 0 010 2.734.75.75 0 101.06 1.062 4 4 0 000-4.856z" />
      </svg>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        onClick={toggleMute}
        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon />
      </button>
      <div className="group relative w-20">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${displayVolume * 100}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={displayVolume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}
