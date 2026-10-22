import crypto from 'node:crypto'
import { prisma } from './prisma.js'

export const SESSION_COOKIE = 'dayflow_session'

function sessionDays() {
  const value = Number(process.env.SESSION_DAYS || 30)
  return Number.isFinite(value) && value > 0 ? value : 30
}

function baseCookieOptions() {
  const production = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: production ? 'lax' : 'lax',
    secure: production,
    path: '/',
  }
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function sessionCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: sessionDays() * 24 * 60 * 60 * 1000,
  }
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions())
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + sessionCookieOptions().maxAge)

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  })

  return { token, expiresAt }
}

export async function deleteSessionByToken(token) {
  if (!token) return
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  })
}
