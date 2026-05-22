import { type NextRequest } from 'next/server'

import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  clearAuthCookies,
  handleApiError,
  ok,
} from '@/lib/api'
import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value
    const refreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value

    // Try to identify the user from the access token (may already be expired)
    if (accessToken || refreshToken) {
      let userId: string | null = null

      if (accessToken) {
        try {
          const payload = await verifyAccessToken(accessToken)
          userId = payload.sub
        } catch {
          // Token may be expired — that's fine, still proceed with logout
        }
      }

      if (userId) {
        // Revoke the refresh token stored in DB
        await prisma.user.update({
          where: { id: userId },
          data: { refreshToken: null, refreshTokenExpiresAt: null },
        })
      }
    }

    const response = ok(null, 'Logged out successfully')
    clearAuthCookies(response)
    return response
  } catch (error) {
    return handleApiError(error, 'logout')
  }
}

// Allow GET for convenient browser/link-based logout
export async function GET(request: NextRequest) {
  return POST(request)
}
