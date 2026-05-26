'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayMode = 'normal' | 'repeat' | 'shuffle'

export interface PlayerSong {
  id: string
  title: string
  artistName: string
  audioUrl: string
  coverUrl: string | null
  duration: number | null
}

// ─── Audio singleton (module-level, initialized by PlayerProvider) ────────────

let _audio: HTMLAudioElement | null = null

/** Called once by PlayerProvider on mount. */
export function initPlayerAudio(el: HTMLAudioElement): void {
  _audio = el
}

export function getPlayerAudio(): HTMLAudioElement | null {
  return _audio
}

// ─── Fisher-Yates Shuffle ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Store State + Actions ────────────────────────────────────────────────────

interface PlayerState {
  currentSong: PlayerSong | null
  queue: PlayerSong[]
  shuffledQueue: PlayerSong[]
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  speed: number
  playMode: PlayMode
  isQueueOpen: boolean
}

interface PlayerActions {
  /** Play a song, optionally replacing the whole queue. */
  setSong: (song: PlayerSong, queue?: PlayerSong[]) => void
  addToQueue: (song: PlayerSong) => void
  removeFromQueue: (index: number) => void
  jumpToIndex: (index: number) => void

  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void

  setVolume: (vol: number) => void
  toggleMute: () => void
  setSpeed: (speed: number) => void
  setPlayMode: (mode: PlayMode) => void

  // Internal — called by PlayerProvider event listeners
  _setCurrentTime: (t: number) => void
  _setDuration: (d: number) => void
  _setIsPlaying: (p: boolean) => void
  _onEnded: () => void

  toggleQueue: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      currentSong: null,
      queue: [],
      shuffledQueue: [],
      currentIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      speed: 1,
      playMode: 'normal',
      isQueueOpen: false,

      // ─── Queue management ────────────────────────────────────────────────

      setSong: (song, queue) => {
        const newQueue = queue ?? [song]
        const idx = Math.max(
          0,
          newQueue.findIndex((s) => s.id === song.id),
        )

        set({
          currentSong: song,
          queue: newQueue,
          shuffledQueue: shuffle(newQueue),
          currentIndex: idx,
          isPlaying: true,
          currentTime: 0,
          duration: song.duration ?? 0,
        })

        const audio = getPlayerAudio()
        if (audio) {
          audio.src = song.audioUrl
          audio.playbackRate = get().speed
          audio.volume = get().isMuted ? 0 : get().volume
          audio.play().catch(console.error)
        }
      },

      addToQueue: (song) => {
        set((s) => ({
          queue: [...s.queue, song],
          shuffledQueue: shuffle([...s.queue, song]),
        }))
      },

      removeFromQueue: (index) => {
        const { queue, currentIndex } = get()
        const next = queue.filter((_, i) => i !== index)
        const nextIdx = index < currentIndex ? currentIndex - 1 : currentIndex
        set({ queue: next, shuffledQueue: shuffle(next), currentIndex: nextIdx })
      },

      jumpToIndex: (index) => {
        const { queue, playMode, shuffledQueue } = get()
        const song = playMode === 'shuffle' ? shuffledQueue[index] : queue[index]
        if (!song) return

        set({ currentSong: song, currentIndex: index, isPlaying: true, currentTime: 0 })
        const audio = getPlayerAudio()
        if (audio) {
          audio.src = song.audioUrl
          audio.play().catch(console.error)
        }
      },

      // ─── Playback ────────────────────────────────────────────────────────

      play: () => {
        const audio = getPlayerAudio()
        if (audio && get().currentSong) {
          audio.play().catch(console.error)
          set({ isPlaying: true })
        }
      },

      pause: () => {
        const audio = getPlayerAudio()
        audio?.pause()
        set({ isPlaying: false })
      },

      toggle: () => {
        if (get().isPlaying) get().pause()
        else get().play()
      },

      next: () => {
        const { queue, shuffledQueue, currentIndex, playMode } = get()
        const list = playMode === 'shuffle' ? shuffledQueue : queue
        if (list.length === 0) return

        const nextIdx = (currentIndex + 1) % list.length
        const song = list[nextIdx]
        if (!song) return

        set({ currentSong: song, currentIndex: nextIdx, isPlaying: true, currentTime: 0 })
        const audio = getPlayerAudio()
        if (audio) {
          audio.src = song.audioUrl
          audio.play().catch(console.error)
        }
      },

      prev: () => {
        const { queue, shuffledQueue, currentIndex, playMode, currentTime } = get()

        // Restart current song if more than 3 s have played
        if (currentTime > 3) {
          const audio = getPlayerAudio()
          if (audio) audio.currentTime = 0
          set({ currentTime: 0 })
          return
        }

        const list = playMode === 'shuffle' ? shuffledQueue : queue
        if (list.length === 0) return

        const prevIdx = (currentIndex - 1 + list.length) % list.length
        const song = list[prevIdx]
        if (!song) return

        set({ currentSong: song, currentIndex: prevIdx, isPlaying: true, currentTime: 0 })
        const audio = getPlayerAudio()
        if (audio) {
          audio.src = song.audioUrl
          audio.play().catch(console.error)
        }
      },

      seek: (time) => {
        const audio = getPlayerAudio()
        if (audio && isFinite(time)) {
          audio.currentTime = time
          set({ currentTime: time })
        }
      },

      // ─── Audio settings ──────────────────────────────────────────────────

      setVolume: (vol) => {
        const v = Math.max(0, Math.min(1, vol))
        const audio = getPlayerAudio()
        if (audio) audio.volume = v
        set({ volume: v, isMuted: v === 0 })
      },

      toggleMute: () => {
        const { isMuted, volume } = get()
        const audio = getPlayerAudio()
        if (isMuted) {
          if (audio) audio.volume = volume
          set({ isMuted: false })
        } else {
          if (audio) audio.volume = 0
          set({ isMuted: true })
        }
      },

      setSpeed: (speed) => {
        const audio = getPlayerAudio()
        if (audio) audio.playbackRate = speed
        set({ speed })
      },

      setPlayMode: (mode) => {
        set((s) => ({
          playMode: mode,
          shuffledQueue: mode === 'shuffle' ? shuffle(s.queue) : s.shuffledQueue,
        }))
      },

      // ─── Internal (called by PlayerProvider) ─────────────────────────────

      _setCurrentTime: (t) => set({ currentTime: t }),
      _setDuration: (d) => set({ duration: d }),
      _setIsPlaying: (p) => set({ isPlaying: p }),

      _onEnded: () => {
        const { playMode, queue, currentIndex } = get()

        if (playMode === 'repeat') {
          const audio = getPlayerAudio()
          if (audio) {
            audio.currentTime = 0
            audio.play().catch(console.error)
          }
          return
        }

        const isLastInNormal = playMode === 'normal' && currentIndex === queue.length - 1
        if (isLastInNormal) {
          set({ isPlaying: false, currentTime: 0 })
        } else {
          get().next()
        }
      },

      toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
    }),

    {
      name: 'scarbormusic-player',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        }
        return localStorage
      }),
      partialize: (s) => ({
        volume: s.volume,
        isMuted: s.isMuted,
        speed: s.speed,
        playMode: s.playMode,
        currentSong: s.currentSong,
        queue: s.queue,
        shuffledQueue: s.shuffledQueue,
        currentIndex: s.currentIndex,
      }),
    },
  ),
)
