import { describe, expect, it } from 'vitest'

import {
  addSongToPlaylistSchema,
  createPlaylistSchema,
  reorderPlaylistSongsSchema,
  updatePlaylistSchema,
} from '@/lib/validators/playlist'

describe('playlist validators', () => {
  it('accepts valid create playlist input', () => {
    const result = createPlaylistSchema.safeParse({
      name: 'My Playlist',
      description: 'Chill vibes',
      isPublic: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty playlist name', () => {
    const result = createPlaylistSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts partial update', () => {
    const result = updatePlaylistSchema.safeParse({ isPublic: false })
    expect(result.success).toBe(true)
  })

  it('validates add song UUID', () => {
    const ok = addSongToPlaylistSchema.safeParse({
      songId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(ok.success).toBe(true)

    const bad = addSongToPlaylistSchema.safeParse({ songId: 'not-uuid' })
    expect(bad.success).toBe(false)
  })

  it('validates reorder positions', () => {
    const result = reorderPlaylistSongsSchema.safeParse({
      songs: [
        { songId: '550e8400-e29b-41d4-a716-446655440000', position: 0 },
        { songId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', position: 1 },
      ],
    })
    expect(result.success).toBe(true)
  })
})
