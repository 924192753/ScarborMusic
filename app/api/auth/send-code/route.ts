import { type NextRequest } from 'next/server'

import { badRequest, handleApiError, ok, parseBody, tooManyRequests } from '@/lib/api'
import { sendVerificationCode } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { CacheKeys, getCache, incrementCache, setCache } from '@/lib/redis'
import { sendCodeSchema } from '@/lib/validators/auth'

const CODE_TTL_SECONDS = 5 * 60 // 5 minutes
const RATE_LIMIT_MAX = 3 // max 3 codes per 10 minutes per IP
const RATE_LIMIT_WINDOW = 10 * 60

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, sendCodeSchema)
    if (!('data' in parsed)) return parsed

    const { email, type } = parsed.data

    // ─── Rate limiting (per IP) ─────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const rateKey = CacheKeys.rateLimitSendCode(ip)
    const attempts = await incrementCache(rateKey, RATE_LIMIT_WINDOW)
    if (attempts > RATE_LIMIT_MAX) {
      return tooManyRequests('Too many code requests. Please wait 10 minutes and try again.')
    }

    // ─── Check if a valid code already exists in Redis ──────────────────────
    const existingCode = await getCache(CacheKeys.emailCode(email, type))
    if (existingCode) {
      return badRequest(
        'A verification code was already sent. Please wait before requesting a new one.',
      )
    }

    // ─── Generate and persist code ──────────────────────────────────────────
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000)

    // Primary: Redis (TTL 5 min)
    await setCache(CacheKeys.emailCode(email, type), code, CODE_TTL_SECONDS)

    // Fallback: Database
    await prisma.emailVerificationCode.create({
      data: { email, code, type, expiresAt },
    })

    // ─── Send email (best-effort; failure doesn't block the response) ────────
    try {
      await sendVerificationCode(email, code, type as 'register' | 'reset_password')
    } catch (emailError) {
      console.error('[send-code] Email delivery failed:', emailError)
      // In development: log the code so testing doesn't require real SMTP
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DEV] Verification code for ${email}: ${code}`)
      }
    }

    const responseData: Record<string, unknown> = { email }
    // Expose code in development to simplify testing without real SMTP
    if (process.env.NODE_ENV === 'development') {
      responseData.code = code
      responseData._dev_note = 'Code exposed only in development mode'
    }

    return ok(responseData, `Verification code sent to ${email}. It expires in 5 minutes.`)
  } catch (error) {
    return handleApiError(error, 'send-code')
  }
}
