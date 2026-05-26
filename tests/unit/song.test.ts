import { describe, expect, it } from 'vitest'

import { createSongSchema, listSongsSchema, updateSongSchema } from '@/lib/validators/song'

const validSong = {
  title: 'Test Song',
  artistName: 'Test Artist',
  audioFileId: '550e8400-e29b-41d4-a716-446655440000',
  status: 'DRAFT' as const,
  tagIds: [1, 2],
}

describe('song validators', () => {
  it('accepts valid create song input', () => {
    const result = createSongSchema.safeParse(validSong)
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = createSongSchema.safeParse({ ...validSong, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid audio file id', () => {
    const result = createSongSchema.safeParse({ ...validSong, audioFileId: 'bad' })
    expect(result.success).toBe(false)
  })

  it('limits tag count to 10', () => {
    const result = createSongSchema.safeParse({
      ...validSong,
      tagIds: Array.from({ length: 11 }, (_, i) => i + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts list query defaults', () => {
    const result = listSongsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.sort).toBe('latest')
    }
  })

  it('accepts partial update', () => {
    const result = updateSongSchema.safeParse({ status: 'PUBLISHED' })
    expect(result.success).toBe(true)
  })
})
