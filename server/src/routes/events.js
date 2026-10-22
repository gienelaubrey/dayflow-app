import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const CATEGORIES = new Set([
  'Personal',
  'Work',
  'Study',
  'Interview',
  'Health',
  'Other',
])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function dateString(value) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function publicEvent(event) {
  return {
    id: event.id,
    title: event.title,
    date: dateString(event.date),
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
    location: event.location,
    description: event.description,
  }
}

function parseDate(value) {
  if (value === undefined) return { provided: false }
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { provided: true, error: 'Event date must use YYYY-MM-DD.' }
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { provided: true, error: 'Enter a valid event date.' }
  }

  return { provided: true, value: parsed }
}

function validTime(value) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) return false
  const [hour, minute] = value.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function eventData(body, { partial = false } = {}) {
  const data = {}

  if (!partial || Object.hasOwn(body ?? {}, 'title')) {
    const title = String(body?.title ?? '').trim()
    if (!title) return { error: 'Enter an event title.' }
    if (title.length > 150) return { error: 'Event title must be 150 characters or fewer.' }
    data.title = title
  }

  const parsedDate = parseDate(body?.date)
  if (parsedDate.error) return { error: parsedDate.error }
  if (!partial || parsedDate.provided) {
    if (!parsedDate.value) return { error: 'Choose an event date.' }
    data.date = parsedDate.value
  }

  if (!partial || Object.hasOwn(body ?? {}, 'startTime')) {
    const startTime = body?.startTime ?? '09:00'
    if (!validTime(startTime)) return { error: 'Enter a valid start time.' }
    data.startTime = startTime
  }

  if (!partial || Object.hasOwn(body ?? {}, 'endTime')) {
    const endTime = body?.endTime ?? '10:00'
    if (!validTime(endTime)) return { error: 'Enter a valid end time.' }
    data.endTime = endTime
  }

  const effectiveStart = data.startTime ?? body?.startTime
  const effectiveEnd = data.endTime ?? body?.endTime
  if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
    return { error: 'The end time must be later than the start time.' }
  }

  if (!partial || Object.hasOwn(body ?? {}, 'category')) {
    const category = body?.category ?? 'Personal'
    if (!CATEGORIES.has(category)) return { error: 'Choose a valid event category.' }
    data.category = category
  }

  if (!partial || Object.hasOwn(body ?? {}, 'location')) {
    const location = String(body?.location ?? '').trim()
    if (location.length > 200) return { error: 'Location must be 200 characters or fewer.' }
    data.location = location
  }

  if (!partial || Object.hasOwn(body ?? {}, 'description')) {
    const description = String(body?.description ?? '').trim()
    if (description.length > 2000) {
      return { error: 'Event notes must be 2000 characters or fewer.' }
    }
    data.description = description
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: 'No event changes were provided.' }
  }

  return { data }
}

async function findOwnedEvent(userId, id) {
  return prisma.event.findFirst({ where: { id, userId } })
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return res.json({ events: events.map(publicEvent) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = eventData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const event = await prisma.event.create({
      data: { userId: req.user.id, ...parsed.data },
    })

    return res.status(201).json({ event: publicEvent(event) })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedEvent(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Event not found.' })

    const parsed = eventData(req.body, { partial: true })
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const startTime = parsed.data.startTime ?? existing.startTime
    const endTime = parsed.data.endTime ?? existing.endTime
    if (endTime <= startTime) {
      return res.status(400).json({ error: 'The end time must be later than the start time.' })
    }

    const event = await prisma.event.update({
      where: { id: existing.id },
      data: parsed.data,
    })

    return res.json({ event: publicEvent(event) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.event.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })

    if (result.count === 0) return res.status(404).json({ error: 'Event not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace the signed-in user's complete event collection.
// Used for backup restore and one-time migration from localStorage.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.events)) {
      return res.status(400).json({ error: 'Events must be an array.' })
    }

    if (req.body.events.length > 1000) {
      return res.status(413).json({ error: 'A maximum of 1000 events can be restored at once.' })
    }

    const cleaned = []
    for (const raw of req.body.events) {
      const parsed = eventData(raw)
      if (parsed.error) return res.status(400).json({ error: parsed.error })
      cleaned.push(parsed.data)
    }

    const events = await prisma.$transaction(async tx => {
      await tx.event.deleteMany({ where: { userId: req.user.id } })

      for (const item of cleaned) {
        await tx.event.create({ data: { userId: req.user.id, ...item } })
      }

      return tx.event.findMany({
        where: { userId: req.user.id },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
          { createdAt: 'asc' },
        ],
      })
    })

    return res.json({ events: events.map(publicEvent) })
  } catch (error) {
    next(error)
  }
})

export default router
