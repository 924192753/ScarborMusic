import { z } from 'zod'

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}

export const adminListUsersSchema = z.object({
  ...paginationSchema,
  q: z.string().max(128).optional(),
})

export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    roleName: z.enum(['ADMIN', 'USER']).optional(),
  })
  .refine((data) => data.isActive !== undefined || data.roleName !== undefined, {
    message: 'At least one field (isActive or roleName) is required',
  })

export const adminListSongsSchema = z.object({
  ...paginationSchema,
  q: z.string().max(128).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']).optional(),
})

export const adminUpdateSongSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN']),
})

export const adminBatchDeleteSongsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
})

export const adminListCommentsSchema = z.object({
  ...paginationSchema,
  q: z.string().max(128).optional(),
  status: z.enum(['VISIBLE', 'HIDDEN', 'DELETED']).optional(),
})

export const adminUpdateCommentSchema = z.object({
  status: z.enum(['VISIBLE', 'HIDDEN', 'DELETED']),
})

export const adminCreateCategorySchema = z.object({
  name: z.string().min(1).max(64),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(255).optional(),
})

export const adminUpdateCategorySchema = adminCreateCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })

export const adminCreateTagSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export const adminUpdateTagSchema = adminCreateTagSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })

export const adminListPlaylistsSchema = z.object({
  ...paginationSchema,
  q: z.string().max(128).optional(),
})

export const adminUpdatePlaylistSchema = z
  .object({
    isPublic: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .refine((data) => data.isPublic !== undefined || data.hidden !== undefined, {
    message: 'At least one field (isPublic or hidden) is required',
  })
