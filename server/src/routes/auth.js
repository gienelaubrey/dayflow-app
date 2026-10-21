import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { sendVerificationEmail } from '../lib/email.js'
import {
  generateOtp,
  hashOtp,
  otpExpiry,
  otpMatches,
  otpMaxAttempts,
  otpResendSeconds,
  secondsUntilResend,
} from '../lib/otp.js'
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

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } })
    const retryAfterSeconds = secondsUntilResend(pending?.lastSentAt)
    if (retryAfterSeconds > 0) {
      return res.status(429).json({
        error: `A verification code was already sent. Try again in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      })
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12)
    const code = generateOtp()
    const now = new Date()

    await prisma.pendingRegistration.upsert({
      where: { email },
      create: {
        name,
        email,
        passwordHash,
        otpHash: hashOtp(code),
        expiresAt: otpExpiry(),
        attempts: 0,
        lastSentAt: now,
      },
      update: {
        name,
        passwordHash,
        otpHash: hashOtp(code),
        expiresAt: otpExpiry(),
        attempts: 0,
        lastSentAt: now,
      },
    })

    try {
      await sendVerificationEmail({ to: email, code })
    } catch (emailError) {
      console.error('Verification email failed:', emailError)
      await prisma.pendingRegistration.deleteMany({ where: { email } })
      return res.status(502).json({
        error: 'We could not send the verification email. Check the email service configuration and try again.',
      })
    }

    return res.status(202).json({
      verificationRequired: true,
      email,
      resendAfterSeconds: otpResendSeconds(),
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'An account with this email already exists. Try logging in instead.',
      })
    }
    next(error)
  }
})

router.post('/verify-email', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const code = String(req.body?.code ?? '').trim()

    if (validateEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit verification code.' })
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } })
    if (!pending) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return res.status(409).json({ error: 'This account is already verified. Log in instead.' })
      }
      return res.status(404).json({ error: 'No pending registration was found. Create the account again.' })
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      return res.status(410).json({ error: 'That code has expired. Request a new code.' })
    }

    const maxAttempts = otpMaxAttempts()
    if (pending.attempts >= maxAttempts) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' })
    }

    if (!otpMatches(code, pending.otpHash)) {
      const updated = await prisma.pendingRegistration.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      })
      const remaining = Math.max(0, maxAttempts - updated.attempts)
      return res.status(400).json({
        error: remaining
          ? `That code is incorrect. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`
          : 'Too many incorrect attempts. Request a new code.',
      })
    }

    const user = await prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email } })
      if (existing) {
        await tx.pendingRegistration.deleteMany({ where: { email } })
        return existing
      }

      const created = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          passwordHash: pending.passwordHash,
          emailVerifiedAt: new Date(),
        },
      })

      await tx.pendingRegistration.delete({ where: { email } })
      return created
    })

    await issueSession(res, user.id)
    return res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'This account is already verified. Log in instead.' })
    }
    next(error)
  }
})

router.post('/resend-otp', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email)
    if (validateEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'This account is already verified. Log in instead.' })
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } })
    if (!pending) {
      return res.status(404).json({ error: 'No pending registration was found. Create the account again.' })
    }

    const retryAfterSeconds = secondsUntilResend(pending.lastSentAt)
    if (retryAfterSeconds > 0) {
      return res.status(429).json({
        error: `You can request another code in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      })
    }

    const code = generateOtp()

    try {
      await sendVerificationEmail({ to: email, code })
    } catch (emailError) {
      console.error('Verification email resend failed:', emailError)
      return res.status(502).json({ error: 'We could not send a new verification email. Try again shortly.' })
    }

    await prisma.pendingRegistration.update({
      where: { email },
      data: {
        otpHash: hashOtp(code),
        expiresAt: otpExpiry(),
        attempts: 0,
        lastSentAt: new Date(),
      },
    })

    return res.json({
      ok: true,
      email,
      resendAfterSeconds: otpResendSeconds(),
    })
  } catch (error) {
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
