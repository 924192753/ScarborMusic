import { z } from 'zod'

export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required').max(255),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().default(true),
  coverFileId: z.string().uuid().optional(),
})

export const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().optional(),
  coverFileId: z.string().uuid().optional().nullable(),
})

export const addSongToPlaylistSchema = z.object({
  songId: z.string().uuid('Invalid song ID'),
})

export const reorderPlaylistSongsSchema = z.object({
  songs: z.array(
    z.object({
      songId: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
})

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>
export type AddSongToPlaylistInput = z.infer<typeof addSongToPlaylistSchema>
export type ReorderPlaylistSongsInput = z.infer<typeof reorderPlaylistSongsSchema>
