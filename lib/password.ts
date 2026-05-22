import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a plain-text password using bcrypt.
 * Salt rounds = 12 balances security and performance (~250ms on modern hardware).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
