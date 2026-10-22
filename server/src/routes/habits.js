import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

function dateString(value) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function publicHabit(habit) {
  return {
    id: habit.id,
    name: habit.name,
    icon: habit.emoji || '✨',
    color: habit.color || '#D783A2',
    completedDates: (habit.completions || []).map(item => dateString(item.date)),
    createdAt: habit.createdAt.toISOString(),
  }
}

function parseDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { error: 'Date must use YYYY-MM-DD.' }
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'Enter a valid completion date.' }
  }

  return { value: parsed }
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function habitData(body, { partial = false } = {}) {
  const data = {}

  if (!partial || Object.hasOwn(body ?? {}, 'name')) {
    const name = String(body?.name ?? '').trim()
    if (!name) return { error: 'Enter a habit name.' }
    if (name.length > 120) return { error: 'Habit name must be 120 characters or fewer.' }
    data.name = name
  }

  if (!partial || Object.hasOwn(body ?? {}, 'icon') || Object.hasOwn(body ?? {}, 'emoji')) {
    const icon = String(body?.icon ?? body?.emoji ?? '✨').trim() || '✨'
    if (icon.length > 16) return { error: 'Habit icon is too long.' }
    data.emoji = icon
  }

  if (!partial || Object.hasOwn(body ?? {}, 'color')) {
    const color = String(body?.color ?? '#D783A2').trim() || '#D783A2'
    if (!HEX_COLOR_RE.test(color)) return { error: 'Habit color must be a six-digit hex color.' }
    data.color = color.toUpperCase()
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: 'No habit changes were provided.' }
  }

  return { data }
}

async function findOwnedHabit(userId, id) {
  return prisma.habit.findFirst({ where: { id, userId } })
}

async function readHabit(userId, id) {
  return prisma.habit.findFirst({
    where: { id, userId },
    include: { completions: { orderBy: { date: 'asc' } } },
  })
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user.id },
      include: { completions: { orderBy: { date: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    })

    return res.json({ habits: habits.map(publicHabit) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = habitData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const habit = await prisma.habit.create({
      data: { userId: req.user.id, ...parsed.data },
      include: { completions: true },
    })

    return res.status(201).json({ habit: publicHabit(habit) })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedHabit(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Habit not found.' })

    const parsed = habitData(req.body, { partial: true })
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    await prisma.habit.update({
      where: { id: existing.id },
      data: parsed.data,
    })

    const habit = await readHabit(req.user.id, existing.id)
    return res.json({ habit: publicHabit(habit) })
  } catch (error) {
    next(error)
  }
})

// Idempotently set one habit's completion state for a specific calendar date.
router.patch('/:id/completion', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedHabit(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Habit not found.' })

    const parsedDate = parseDate(req.body?.date)
    if (parsedDate.error) return res.status(400).json({ error: parsedDate.error })
    if (typeof req.body?.completed !== 'boolean') {
      return res.status(400).json({ error: 'Completion status must be true or false.' })
    }

    if (req.body.completed) {
      await prisma.habitCompletion.upsert({
        where: {
          habitId_date: {
            habitId: existing.id,
            date: parsedDate.value,
          },
        },
        create: {
          habitId: existing.id,
          date: parsedDate.value,
        },
        update: {},
      })
    } else {
      await prisma.habitCompletion.deleteMany({
        where: {
          habitId: existing.id,
          date: parsedDate.value,
        },
      })
    }

    const habit = await readHabit(req.user.id, existing.id)
    return res.json({ habit: publicHabit(habit) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.habit.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })

    if (result.count === 0) return res.status(404).json({ error: 'Habit not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace the signed-in user's full habit collection and completion history.
// Used by backup restore and the one-time localStorage migration.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.habits)) {
      return res.status(400).json({ error: 'Habits must be an array.' })
    }
    if (req.body.habits.length > 500) {
      return res.status(413).json({ error: 'A maximum of 500 habits can be restored at once.' })
    }

    const cleaned = []
    let totalCompletions = 0

    for (const raw of req.body.habits) {
      const parsed = habitData(raw)
      if (parsed.error) return res.status(400).json({ error: parsed.error })

      const sourceDates = Array.isArray(raw?.completedDates) ? raw.completedDates : []
      const uniqueDates = [...new Set(sourceDates)]
      const completedDates = []

      for (const date of uniqueDates) {
        const parsedDate = parseDate(date)
        if (parsedDate.error) return res.status(400).json({ error: parsedDate.error })
        completedDates.push(parsedDate.value)
      }

      totalCompletions += completedDates.length
      if (totalCompletions > 25000) {
        return res.status(413).json({ error: 'The habit backup contains too much completion history.' })
      }

      cleaned.push({
        data: parsed.data,
        completedDates,
        createdAt: parseTimestamp(raw?.createdAt),
      })
    }

    const habits = await prisma.$transaction(async tx => {
      await tx.habit.deleteMany({ where: { userId: req.user.id } })

      for (const item of cleaned) {
        await tx.habit.create({
          data: {
            userId: req.user.id,
            ...item.data,
            ...(item.createdAt ? { createdAt: item.createdAt } : {}),
            completions: {
              create: item.completedDates.map(date => ({ date })),
            },
          },
        })
      }

      return tx.habit.findMany({
        where: { userId: req.user.id },
        include: { completions: { orderBy: { date: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      })
    })

    return res.json({ habits: habits.map(publicHabit) })
  } catch (error) {
    next(error)
  }
})

export default router
