import { type NextRequest, NextResponse } from 'next/server'

import { type ZodSchema } from 'zod'

// ─── BigInt Serialization ─────────────────────────────────────────────────────
// JSON.stringify cannot serialize BigInt natively. This helper converts BigInt
// values to strings before passing to NextResponse.json().
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
  ) as T
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true
  message: string
  data: T
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ─── Response Builders ────────────────────────────────────────────────────────

export function ok<T>(data: T, message = 'ok', status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, message, data: serialize(data) }, { status })
}

export function created<T>(data: T, message = 'Created'): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, message, data: serialize(data) }, { status: 201 })
}

export function badRequest(
  message: string,
  errors?: Record<string, string[]>,
): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message, ...(errors && { errors }) }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized'): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 401 })
}

export function forbidden(message = 'Forbidden'): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 403 })
}

export function notFound(message = 'Not found'): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 404 })
}

export function conflict(message: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 409 })
}

export function tooManyRequests(message = 'Too many requests'): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 429 })
}

export function serverError(message = 'Internal server error'): NextResponse<ApiError> {
  return NextResponse.json({ success: false, message }, { status: 500 })
}

// ─── Zod Validation Helper ────────────────────────────────────────────────────

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T } | NextResponse<ApiError>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root'
      if (!fieldErrors[key]) fieldErrors[key] = []
      fieldErrors[key].push(issue.message)
    }
    return badRequest(result.error.issues[0]?.message ?? 'Validation error', fieldErrors)
  }

  return { data: result.data }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

export const COOKIE_ACCESS_TOKEN = 'access_token'
export const COOKIE_REFRESH_TOKEN = 'refresh_token'

import { shouldUseSecureCookies } from '@/lib/cookie-options'

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const secure = shouldUseSecureCookies()
  response.cookies.set(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })
  response.cookies.set(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_ACCESS_TOKEN, '', { maxAge: 0, path: '/' })
  response.cookies.set(COOKIE_REFRESH_TOKEN, '', { maxAge: 0, path: '/' })
}

// ─── Error Handler ────────────────────────────────────────────────────────────

export function handleApiError(error: unknown, context = 'API'): NextResponse<ApiError> {
  console.error(`[${context}] Unexpected error:`, error)
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return serverError(error.message)
  }
  return serverError()
}
