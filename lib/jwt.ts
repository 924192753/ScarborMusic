import { SignJWT, jwtVerify } from 'jose'

export interface JwtPayload {
  sub: string
  email: string
  username: string
  role: string
}

function getSecret(key: string): Uint8Array {
  const secret = process.env[key]
  if (!secret) throw new Error(`Environment variable ${key} is not set`)
  return new TextEncoder().encode(secret)
}

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Generate a short-lived access token (15 minutes).
 * Signed with JWT_SECRET using HS256.
 */
export async function generateAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer('scarbormusic')
    .setAudience('scarbormusic-client')
    .sign(getSecret('JWT_SECRET'))
}

/**
 * Verify and decode an access token.
 * Throws if the token is invalid or expired.
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_SECRET'), {
    issuer: 'scarbormusic',
    audience: 'scarbormusic-client',
  })
  return payload as unknown as JwtPayload
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Generate a long-lived refresh token (7 days).
 * Signed with JWT_REFRESH_SECRET (separate secret for extra security).
 */
export async function generateRefreshToken(payload: Pick<JwtPayload, 'sub'>): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('scarbormusic')
    .setAudience('scarbormusic-refresh')
    .sign(getSecret('JWT_REFRESH_SECRET'))
}

/**
 * Verify and decode a refresh token.
 * Throws if the token is invalid or expired.
 */
export async function verifyRefreshToken(token: string): Promise<Pick<JwtPayload, 'sub'>> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'), {
    issuer: 'scarbormusic',
    audience: 'scarbormusic-refresh',
  })
  return { sub: payload.sub as string }
}
