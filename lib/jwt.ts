import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export type JWTPayload = {
  userId: string
  email: string
  role: 'user' | 'admin'
}

/**
 * Sign a JWT token with 7-day expiry.
 * Used in API routes (Node.js runtime).
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verify and decode a JWT token.
 * Used in API routes (Node.js runtime).
 * Returns null if token is invalid or expired.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch {
    return null
  }
}
