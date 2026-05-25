import { beforeAll, describe, expect, it } from 'vitest'

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/lib/jwt'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-32chars-min!!'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32chars!!'
})

describe('JWT', () => {
  const payload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    role: 'USER',
  }

  it('generates and verifies access token', async () => {
    const token = await generateAccessToken(payload)
    expect(token).toBeTruthy()
    const decoded = await verifyAccessToken(token)
    expect(decoded.sub).toBe(payload.sub)
    expect(decoded.email).toBe(payload.email)
    expect(decoded.role).toBe('USER')
  })

  it('generates and verifies refresh token', async () => {
    const token = await generateRefreshToken({ sub: payload.sub })
    const decoded = await verifyRefreshToken(token)
    expect(decoded.sub).toBe(payload.sub)
  })

  it('rejects tampered access token', async () => {
    const token = await generateAccessToken(payload)
    await expect(verifyAccessToken(`${token}x`)).rejects.toThrow()
  })

  it('throws when JWT_SECRET is not set', async () => {
    const prev = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    await expect(generateAccessToken(payload)).rejects.toThrow()
    process.env.JWT_SECRET = prev
  })
})
