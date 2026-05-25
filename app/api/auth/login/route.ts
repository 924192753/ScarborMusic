import { type NextRequest } from 'next/server'

import {
  handleApiError,
  ok,
  parseBody,
  setAuthCookies,
  unauthorized,
} from '@/lib/api'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { verifyPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { enforceRateLimitFromRequest } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validators/auth'

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await enforceRateLimitFromRequest(request, 'auth:login')
    if (rateLimited) return rateLimited

    const parsed = await parseBody(request, loginSchema)
    if (!('data' in parsed)) return parsed

    const { email, password } = parsed.data

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
