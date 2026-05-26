import { z } from 'zod'

// ─── Create Song ──────────────────────────────────────────────────────────────

export const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  artistName: z.string().min(1, 'Artist name is required').max(255),
  albumName: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  lyrics: z.string().max(50000).optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).default('DRAFT'),
  audioFileId: z.string().uuid('Invalid audio file ID'),
  coverFileId: z.string().uuid('Invalid cover file ID').optional(),
  categoryId: z.number().int().positive().optional(),
  tagIds: z.array(z.number().int().positive()).max(10, 'Maximum 10 tags').default([]),
})

export type CreateSongInput = z.infer<typeof createSongSchema>

// ─── Update Song ──────────────────────────────────────────────────────────────

export const updateSongSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  artistName: z.string().min(1).max(255).optional(),
  albumName: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  lyrics: z.string().max(50000).optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).optional(),
  coverFileId: z.string().uuid().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  tagIds: z.array(z.number().int().positive()).max(10).optional(),
})

export type UpdateSongInput = z.infer<typeof updateSongSchema>

// ─── List Songs (query params) ────────────────────────────────────────────────

export const listSongsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  categoryId: z.coerce.number().int().positive().optional(),
  tagId: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).optional(),
  sort: z.enum(['latest', 'popular', 'liked']).default('latest'),
  userId: z.string().uuid().optional(),
})

export type ListSongsInput = z.infer<typeof listSongsSchema>
