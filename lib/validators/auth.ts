import { z } from 'zod'

// ─── Send Verification Code ───────────────────────────────────────────────────

export const sendCodeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  type: z.enum(['register', 'reset_password']).default('register'),
})

export type SendCodeInput = z.infer<typeof sendCodeSchema>

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(32, 'Username must be at most 32 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    code: z
      .string()
      .length(6, 'Verification code must be exactly 6 digits')
      .regex(/^\d+$/, 'Verification code must contain only digits'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ─── Shared ───────────────────────────────────────────────────────────────────

export const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
