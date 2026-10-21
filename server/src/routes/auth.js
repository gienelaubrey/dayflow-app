import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import {
  createSession,
  deleteSessionByToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../lib/session.js'
import { normalizeEmail, publicUser } from '../lib/user.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function validateName(name) {
  const value = String(name ?? '').trim()
  if (!value) return 'Enter your name.'
  if (value.length > 50) return 'Your name must be 50 characters or fewer.'
  return null
}

function validateEmail(email) {
  const value = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Enter a valid email address.'
  }
  if (value.length > 254) return 'Email address is too long.'
  return null
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Your password needs at least 8 characters.'
  }
  if (password.length > 128) return 'Your password is too long.'
  return null
}

async function issueSession(res, userId) {
  const { token } = await createSession(userId)
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
}

router.post('/register', async (req, res, next) => {
  try {
    const nameError = validateName(req.body?.name)
    const emailError = validateEmail(req.body?.email)
    const passwordError = validatePassword(req.body?.password)
    const error = nameError || emailError || passwordError
    if (error) return res.status(400).json({ error })

    const name = req.body.name.trim()
    const email = normalizeEmail(req.body.email)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists. Try logging in instead.',
      })
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    })

    await issueSession(res, user.id)
    return res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'An account with this email already exists. Try logging in instead.',
      })
    }
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = req.body?.password

    if (!email || typeof password !== 'string') {
      return res.status(400).json({ error: 'Enter your email and password.' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }

    await issueSession(res, user.id)
    return res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE]
    await deleteSessionByToken(token)
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.publicUser })
})

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const data = {}

    if (Object.hasOwn(req.body ?? {}, 'name')) {
      const nameError = validateName(req.body.name)
      if (nameError) return res.status(400).json({ error: nameError })
      data.name = req.body.name.trim()
    }

    if (Object.hasOwn(req.body ?? {}, 'avatar')) {
      const avatar = req.body.avatar
      if (avatar !== null && typeof avatar !== 'string') {
        return res.status(400).json({ error: 'Avatar must be an image data URL or null.' })
      }
      if (typeof avatar === 'string' && avatar.length > 750_000) {
        return res.status(413).json({ error: 'Profile image is too large.' })
      }
      data.avatar = avatar || null
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No profile changes were provided.' })
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    })

    return res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

export default router
