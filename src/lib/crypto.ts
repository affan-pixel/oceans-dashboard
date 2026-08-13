// AES-256-GCM encryption for third-party API keys.
// Server-only. Used by the Integrations layer to store keys encrypted at rest.
//
// The encryption key comes from INTEGRATION_ENCRYPTION_KEY env var (must be 32+ chars).
// In dev a fallback key is used — in production ALWAYS set the env var.

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const raw =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    'oceans-talent-dev-encryption-key-change-in-production-32b!'
  // Hash to ensure exactly 32 bytes regardless of input length
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(payload: string): string {
  if (!payload) return ''
  try {
    const [ivHex, tagHex, encHex] = payload.split(':')
    if (!ivHex || !tagHex || !encHex) return ''
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return ''
  }
}

/** Returns a masked hint for display, e.g. "••••2a" — never the full key. */
export function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 6) return '••••'
  return '••••' + key.slice(-4)
}
