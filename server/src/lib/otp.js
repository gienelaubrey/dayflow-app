import crypto from 'node:crypto'

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function otpTtlMinutes() {
  return positiveNumber(process.env.OTP_TTL_MINUTES, 10)
}

export function otpResendSeconds() {
  return positiveNumber(process.env.OTP_RESEND_SECONDS, 45)
}

export function otpMaxAttempts() {
  return Math.floor(positiveNumber(process.env.OTP_MAX_ATTEMPTS, 5))
}

function otpSecret() {
  const secret = process.env.OTP_SECRET || ''
  if (secret.length < 32) {
    throw new Error('OTP_SECRET must be set to a random value of at least 32 characters.')
  }
  return secret
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

export function hashOtp(code) {
  return crypto
    .createHmac('sha256', otpSecret())
    .update(String(code))
    .digest('hex')
}

export function otpMatches(code, expectedHash) {
  if (!expectedHash) return false

  const actual = Buffer.from(hashOtp(code), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export function otpExpiry() {
  return new Date(Date.now() + otpTtlMinutes() * 60 * 1000)
}

export function secondsUntilResend(lastSentAt) {
  if (!lastSentAt) return 0
  const elapsed = Math.floor((Date.now() - new Date(lastSentAt).getTime()) / 1000)
  return Math.max(0, otpResendSeconds() - elapsed)
}
