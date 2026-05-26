'use client'

import { type PlayMode, usePlayerStore } from '@/store/player'

const MODES: PlayMode[] = ['normal', 'repeat', 'shuffle']

const LABELS: Record<PlayMode, string> = {
  normal: 'Sequential',
  repeat: 'Repeat one',
  shuffle: 'Shuffle',
}

export function PlayModeToggle({ className = '' }: { className?: string }) {
  const playMode = usePlayerStore((s) => s.playMode)
  const setPlayMode = usePlayerStore((s) => s.setPlayMode)

  function cycleMode() {
    const next = MODES[(MODES.indexOf(playMode) + 1) % MODES.length]
    setPlayMode(next)
  }

  const isActive = playMode !== 'normal'

  return (
    <button
      onClick={cycleMode}
      title={LABELS[playMode]}
      aria-label={`Play mode: ${LABELS[playMode]}`}
      className={`relative rounded p-1.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} ${className}`}
    >
      {playMode === 'repeat' ? (
        // Repeat-one icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"
            clipRule="evenodd"
          />
        </svg>
      ) : playMode === 'shuffle' ? (
        // Shuffle icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M4.464 3.162A2 2 0 016.28 2h7.44a2 2 0 011.816 1.162l1.154 2.5c.067.145.115.298.14.455H9.58a.75.75 0 000 1.5h7.35a2 2 0 01-1.816 1.162H7.16a.75.75 0 000 1.5h7.354a2 2 0 011.816 1.162l.887 1.923a2 2 0 01-1.816 2.838H4.6a2 2 0 01-1.816-2.838l.887-1.923A2 2 0 015.488 9.75H12.84a.75.75 0 000-1.5H5.488A2 2 0 013.67 6.588L3.31 5.662A2 2 0 014.464 3.162z" />
        </svg>
      ) : (
        // Normal/sequential icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {/* Active dot */}
      {isActive && (
        <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
      )}
    </button>
  )
}
