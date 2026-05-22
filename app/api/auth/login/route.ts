import { type NextRequest } from 'next/server'

import {
  handleApiError,
  ok,
  parseBody,
  setAuthCookies,
  tooManyRequests,
  unauthorized,
} from '@/lib/api'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { verifyPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { CacheKeys, incrementCache } from '@/lib/redis'
import { loginSchema } from '@/lib/validators/auth'

const RATE_LIMIT_MAX = 10 // max 10 login attempts per 15 minutes per IP
const RATE_LIMIT_WINDOW = 15 * 60

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, loginSchema)
    if (!('data' in parsed)) return parsed

    const { email, password } = parsed.data

    // ─── Rate limiting ───────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const attempts = await incrementCache(CacheKeys.rateLimitLogin(ip), RATE_LIMIT_WINDOW)
    if (attempts > RATE_LIMIT_MAX) {
      return tooManyRequests('Too many login attempts. Please try again in 15 minutes.')
    }

    // ─── Find user ───────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        avatarUrl: true,
        emailVerified: true,
        isActive: true,
        role: { select: { name: true } },
      },
    })

    if (!user) {
      return unauthorized('Invalid email or password')
    }

    if (!user.isActive) {
      return unauthorized('Your account has been suspended')
    }

    // ─── Verify password ─────────────────────────────────────────────────────
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return unauthorized('Invalid email or password')
    }

    // ─── Generate tokens ─────────────────────────────────────────────────────
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role.name,
    }

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(tokenPayload),
      generateRefreshToken({ sub: user.id }),
    ])

    // Persist refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, refreshTokenExpiresAt },
    })

    // ─── Build response ──────────────────────────────────────────────────────
    const response = ok(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role.name,
          emailVerified: user.emailVerified,
        },
        accessToken,
      },
      'Login successful',
    )

    setAuthCookies(response, { accessToken, refreshToken })
    return response
  } catch (error) {
    return handleApiError(error, 'login')
  }
}
