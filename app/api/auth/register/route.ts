import { type NextRequest } from 'next/server'

import { badRequest, conflict, created, handleApiError, parseBody, setAuthCookies } from '@/lib/api'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { CacheKeys, deleteCache, getCache } from '@/lib/redis'
import { registerSchema } from '@/lib/validators/auth'

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, registerSchema)
    if (!('data' in parsed)) return parsed

    const { email, username, password, code } = parsed.data

    // ─── Verify code (Redis first, DB fallback) ─────────────────────────────
    const cacheKey = CacheKeys.emailCode(email, 'register')
    const cachedCode = await getCache(cacheKey)

    if (cachedCode) {
      if (cachedCode !== code) {
        return badRequest('Invalid verification code')
      }
    } else {
      // Fallback: check DB
      const dbCode = await prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          type: 'register',
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!dbCode) {
        return badRequest('Invalid or expired verification code')
      }
      // Mark as used
      await prisma.emailVerificationCode.update({
        where: { id: dbCode.id },
        data: { used: true },
      })
    }

    // ─── Check for duplicates ────────────────────────────────────────────────
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ])

    if (existingEmail) return conflict('This email is already registered')
    if (existingUsername) return conflict('This username is already taken')

    // ─── Fetch USER role ─────────────────────────────────────────────────────
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } })
    if (!userRole) return badRequest('System configuration error: USER role not found')

    // ─── Create user ─────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password)
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        emailVerified: true, // Email was verified via the code
        roleId: userRole.id,
        refreshTokenExpiresAt,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    })

    // ─── Generate tokens ─────────────────────────────────────────────────────
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role.name,
    }

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(tokenPayload),
      generateRefreshToken({ sub: user.id }),
    ])

    // Persist refresh token hash in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, refreshTokenExpiresAt },
    })

    // Invalidate the used code from Redis
    await deleteCache(cacheKey)

    // ─── Build response ──────────────────────────────────────────────────────
    const response = created(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        accessToken,
      },
      'Account created successfully',
    )

    setAuthCookies(response, { accessToken, refreshToken })
    return response
  } catch (error) {
    return handleApiError(error, 'register')
  }
}
