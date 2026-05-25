import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '@/lib/password'

describe('password', () => {
  it('hashes and verifies correct password', async () => {
    const hash = await hashPassword('SecureP@ss123')
    expect(hash).not.toBe('SecureP@ss123')
    expect(await verifyPassword('SecureP@ss123', hash)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('SecureP@ss123')
    expect(await verifyPassword('WrongPassword', hash)).toBe(false)
  })

  it('produces different hashes for same input', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
  })
})
