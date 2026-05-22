import { type NextRequest } from 'next/server'

import { COOKIE_REFRESH_TOKEN, handleApiError, ok, setAuthCookies, unauthorized } from '@/lib/api'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value

    if (!refreshToken) {
      return unauthorized('No refresh token provided')
    }

    // ─── Verify refresh token signature ──────────────────────────────────────
    let payload: { sub: string }
    try {
      payload = await verifyRefreshToken(refreshToken)
    } catch {
      return unauthorized('Invalid or expired refresh token')
    }

    // ─── Validate token matches DB record ─────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: {
        id: true,
        email: true,
        username: true,
        refreshToken: true,
        refreshTokenExpiresAt: true,
        isActive: true,
        role: { select: { name: true } },
      },
    })

    if (!user || user.refreshToken !== refreshToken) {
      return unauthorized('Refresh token has been revoked')
    }

    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
      return unauthorized('Refresh token has expired')
    }

    // ─── Issue new token pair (rotate refresh token) ──────────────────────────
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role.name,
    }

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [newAccessToken, newRefreshToken] = await Promise.all([
      generateAccessToken(tokenPayload),
      generateRefreshToken({ sub: user.id }),
    ])

    // Rotate: save new refresh token, invalidate old one
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken, refreshTokenExpiresAt },
    })

    const response = ok({ accessToken: newAccessToken }, 'Token refreshed')
    setAuthCookies(response, { accessToken: newAccessToken, refreshToken: newRefreshToken })
    return response
  } catch (error) {
    return handleApiError(error, 'refresh')
  }
}
