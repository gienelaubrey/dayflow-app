import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function dateString(value) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function publicFocusSession(session) {
  return {
    id: session.id,
    date: dateString(session.date),
    minutes: session.minutes,
    completedAt: session.completedAt.toISOString(),
  }
}

function parseDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { error: 'Focus session date must use YYYY-MM-DD.' }
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'Enter a valid focus session date.' }
  }

  return { value: parsed }
}

function parseCompletedAt(value) {
  if (value === undefined || value === null || value === '') return { value: new Date() }
  if (typeof value !== 'string') return { error: 'Completion time must be a valid timestamp.' }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { error: 'Completion time must be a valid timestamp.' }
  return { value: parsed }
}

function sessionData(body, { allowClientRunId = true } = {}) {
  const parsedDate = parseDate(body?.date)
  if (parsedDate.error) return { error: parsedDate.error }

  const minutes = Number(body?.minutes)
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    return { error: 'Focus minutes must be a whole number between 1 and 1440.' }
  }

  const completedAt = parseCompletedAt(body?.completedAt)
  if (completedAt.error) return { error: completedAt.error }

  const data = {
    date: parsedDate.value,
    minutes,
    completedAt: completedAt.value,
  }

  if (allowClientRunId && body?.clientRunId !== undefined && body?.clientRunId !== null) {
    const clientRunId = String(body.clientRunId).trim()
    if (!clientRunId) return { error: 'Focus session run ID cannot be empty.' }
    if (clientRunId.length > 200) return { error: 'Focus session run ID is too long.' }
    data.clientRunId = clientRunId
  }

  return { data }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const focusSessions = await prisma.focusSession.findMany({
      where: { userId: req.user.id },
      orderBy: [{ completedAt: 'asc' }],
    })

    return res.json({ focusSessions: focusSessions.map(publicFocusSession) })
  } catch (error) {
    next(error)
  }
})

// Completed timer runs provide clientRunId. Returning an existing owned row makes
// retries safe if the browser did not receive the first successful response.
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = sessionData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    if (parsed.data.clientRunId) {
      const existing = await prisma.focusSession.findUnique({
        where: { clientRunId: parsed.data.clientRunId },
      })

      if (existing) {
        if (existing.userId !== req.user.id) {
          return res.status(409).json({ error: 'That focus session run ID is already in use.' })
        }
        return res.json({ focusSession: publicFocusSession(existing) })
      }
    }

    try {
      const focusSession = await prisma.focusSession.create({
        data: { userId: req.user.id, ...parsed.data },
      })
      return res.status(201).json({ focusSession: publicFocusSession(focusSession) })
    } catch (error) {
      // Handle the rare case where the same clientRunId is retried concurrently.
      if (parsed.data.clientRunId && error?.code === 'P2002') {
        const existing = await prisma.focusSession.findUnique({
          where: { clientRunId: parsed.data.clientRunId },
        })
        if (existing?.userId === req.user.id) {
          return res.json({ focusSession: publicFocusSession(existing) })
        }
      }
      throw error
    }
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.focusSession.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (result.count === 0) return res.status(404).json({ error: 'Focus session not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace all focus history for backup restore and one-time localStorage migration.
// clientRunId is intentionally not restored so a portable backup can be imported
// into another account without colliding with a run ID from the source account.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.focusSessions)) {
      return res.status(400).json({ error: 'Focus sessions must be an array.' })
    }
    if (req.body.focusSessions.length > 5000) {
      return res.status(413).json({ error: 'A maximum of 5000 focus sessions can be restored at once.' })
    }

    const cleaned = []
    for (const raw of req.body.focusSessions) {
      const parsed = sessionData(raw, { allowClientRunId: false })
      if (parsed.error) return res.status(400).json({ error: parsed.error })
      cleaned.push(parsed.data)
    }

    const focusSessions = await prisma.$transaction(async tx => {
      await tx.focusSession.deleteMany({ where: { userId: req.user.id } })

      if (cleaned.length > 0) {
        await tx.focusSession.createMany({
          data: cleaned.map(item => ({ userId: req.user.id, ...item })),
        })
      }

      return tx.focusSession.findMany({
        where: { userId: req.user.id },
        orderBy: [{ completedAt: 'asc' }],
      })
    })

    return res.json({ focusSessions: focusSessions.map(publicFocusSession) })
  } catch (error) {
    next(error)
  }
})

export default router
