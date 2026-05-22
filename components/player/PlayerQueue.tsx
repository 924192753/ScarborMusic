'use client'

import Image from 'next/image'

import { usePlayerStore } from '@/store/player'

export function PlayerQueue() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen)
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playMode = usePlayerStore((s) => s.playMode)
  const shuffledQueue = usePlayerStore((s) => s.shuffledQueue)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const jumpToIndex = usePlayerStore((s) => s.jumpToIndex)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)

  const displayQueue = playMode === 'shuffle' ? shuffledQueue : queue

  if (!isQueueOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={toggleQueue}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed bottom-16 right-0 z-50 flex h-[70vh] max-h-[520px] w-80 flex-col rounded-tl-2xl border-l border-t bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Play Queue</h2>
            <p className="text-xs text-muted-foreground">
              {displayQueue.length} song{displayQueue.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={toggleQueue}
            aria-label="Close queue"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="scrollbar-thin flex-1 overflow-y-auto py-1">
          {displayQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-sm text-muted-foreground">The queue is empty.</p>
              <p className="mt-1 text-xs text-muted-foreground">Play a song to add it here.</p>
            </div>
          ) : (
            displayQueue.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id && idx === currentIndex

              return (
                <div
                  key={`${song.id}-${idx}`}
                  className={`group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50 ${isCurrent ? 'bg-primary/8' : ''}`}
                >
                  {/* Cover */}
                  <div
                    className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded bg-muted"
                    onClick={() => jumpToIndex(idx)}
                  >
                    {song.coverUrl ? (
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="h-3 w-3 text-muted-foreground/40"
                        >
                          <path d="M13 3.37A1 1 0 0011.27 2.5l-6.75 1.929A1 1 0 003.5 5.38v8.12a1.5 1.5 0 001.09 2.163l.99.283A1.275 1.275 0 107.25 14.25V8.77l6.75-1.93v4.663a1.5 1.5 0 001.09 2.163l.99.283A1.275 1.275 0 1017.25 12.25V5.38a1 1 0 00-.75-.966L13 3.37z" />
                        </svg>
                      </div>
                    )}
                    {/* Playing indicator */}
                    {isCurrent && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-0.5 rounded-full bg-white animate-bounce"
                              style={{ height: '8px', animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <button className="min-w-0 flex-1 text-left" onClick={() => jumpToIndex(idx)}>
                    <p
                      className={`truncate text-xs font-medium ${isCurrent ? 'text-primary' : ''}`}
                    >
                      {song.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{song.artistName}</p>
                  </button>

                  {/* Remove button */}
                  {!isCurrent && (
                    <button
                      onClick={() => removeFromQueue(idx)}
                      aria-label="Remove from queue"
                      className="hidden rounded p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3 w-3"
                      >
                        <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
