'use client'

import { useEffect, useRef } from 'react'

import { getPlayerAudio, initPlayerAudio, usePlayerStore } from '@/store/player'

/**
 * PlayerProvider — mounts a single HTMLAudioElement for the lifetime of the app.
 * All playback is routed through this element so there is never more than one
 * active audio source at a time.
 *
 * Must be rendered once in the root layout, above all other consumers.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playCounted = useRef<Set<string>>(new Set())
  const lastSongId = useRef<string | null>(null)

  useEffect(() => {
    // Create the singleton audio element
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    initPlayerAudio(audio)

    // Restore persisted settings without auto-playing
    const state = usePlayerStore.getState()
    audio.volume = state.isMuted ? 0 : state.volume
    audio.playbackRate = state.speed

    if (state.currentSong?.audioUrl) {
      audio.src = state.currentSong.audioUrl
      audio.load()
      // Do not auto-play after page refresh
      usePlayerStore.setState({ isPlaying: false, currentTime: 0 })
    }

    // ─── Event listeners ─────────────────────────────────────────────────────

    const onTimeUpdate = () => {
      const { _setCurrentTime, currentSong } = usePlayerStore.getState()
      _setCurrentTime(audio.currentTime)

      // Play count tracking: count after 30s or 50% played (once per song load)
      if (currentSong && currentSong.id !== lastSongId.current) {
        lastSongId.current = currentSong.id
        playCounted.current.delete(currentSong.id) // reset for new song
      }

      if (
        currentSong &&
        !playCounted.current.has(currentSong.id) &&
        audio.duration > 0 &&
        (audio.currentTime >= 30 || audio.currentTime / audio.duration >= 0.5)
      ) {
        playCounted.current.add(currentSong.id)
        fetch(`/api/songs/${currentSong.id}/play`, { method: 'POST' }).catch(console.error)
      }
    }

    const onLoadedMetadata = () => {
      usePlayerStore.getState()._setDuration(audio.duration)
    }

    const onPlay = () => usePlayerStore.getState()._setIsPlaying(true)
    const onPause = () => usePlayerStore.getState()._setIsPlaying(false)
    const onEnded = () => usePlayerStore.getState()._onEnded()

    const onError = () => {
      console.error('[Player] Audio error:', audio.error?.message)
      usePlayerStore.setState({ isPlaying: false })
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [])

  return <>{children}</>
}

/**
 * Lightweight hook to check if the audio singleton is ready.
 * Returns true once PlayerProvider has mounted.
 */
export function useAudioReady(): boolean {
  return getPlayerAudio() !== null
}
