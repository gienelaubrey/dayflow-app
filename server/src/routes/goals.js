import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const CATEGORIES = new Set(['Personal', 'Career', 'Health', 'Learning', 'Finance'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function dateString(value) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function publicGoal(goal) {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    targetDate: dateString(goal.targetDate),
    progress: goal.progress,
    createdAt: goal.createdAt.toISOString(),
  }
}

function parseDate(value) {
  if (value === undefined) return { provided: false }
  if (value === null || value === '') return { provided: true, value: null }
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { provided: true, error: 'Target date must use YYYY-MM-DD.' }
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { provided: true, error: 'Enter a valid target date.' }
  }

  return { provided: true, value: parsed }
}

function goalData(body, { partial = false } = {}) {
  const data = {}

  if (!partial || Object.hasOwn(body ?? {}, 'title')) {
    const title = String(body?.title ?? '').trim()
    if (!title) return { error: 'Enter a goal title.' }
    if (title.length > 160) return { error: 'Goal title must be 160 characters or fewer.' }
    data.title = title
  }

  if (!partial || Object.hasOwn(body ?? {}, 'description')) {
    const description = String(body?.description ?? '').trim()
    if (description.length > 2000) {
      return { error: 'Goal description must be 2000 characters or fewer.' }
    }
    data.description = description
  }

  if (!partial || Object.hasOwn(body ?? {}, 'category')) {
    const category = body?.category ?? 'Personal'
    if (!CATEGORIES.has(category)) return { error: 'Choose a valid goal category.' }
    data.category = category
  }

  const targetDate = parseDate(body?.targetDate)
  if (targetDate.error) return { error: targetDate.error }
  if (!partial || targetDate.provided) data.targetDate = targetDate.value ?? null

  if (!partial || Object.hasOwn(body ?? {}, 'progress')) {
    const progress = Number(body?.progress ?? 0)
    if (!Number.isFinite(progress)) return { error: 'Goal progress must be a number.' }
    const rounded = Math.round(progress)
    if (rounded < 0 || rounded > 100) {
      return { error: 'Goal progress must be between 0 and 100.' }
    }
    data.progress = rounded
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: 'No goal changes were provided.' }
  }

  return { data }
}

function validCreatedAt(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function findOwnedGoal(userId, id) {
  return prisma.goal.findFirst({ where: { id, userId } })
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: [{ createdAt: 'asc' }],
    })
    return res.json({ goals: goals.map(publicGoal) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = goalData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const goal = await prisma.goal.create({
      data: { userId: req.user.id, ...parsed.data },
    })
    return res.status(201).json({ goal: publicGoal(goal) })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedGoal(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Goal not found.' })

    const parsed = goalData(req.body, { partial: true })
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const goal = await prisma.goal.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    return res.json({ goal: publicGoal(goal) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.goal.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (result.count === 0) return res.status(404).json({ error: 'Goal not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace the signed-in user's complete goal collection.
// Used by backup restore and the one-time migration from localStorage.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.goals)) {
      return res.status(400).json({ error: 'Goals must be an array.' })
    }
    if (req.body.goals.length > 500) {
      return res.status(413).json({ error: 'A maximum of 500 goals can be restored at once.' })
    }

    const cleaned = []
    for (const raw of req.body.goals) {
      const parsed = goalData(raw)
      if (parsed.error) return res.status(400).json({ error: parsed.error })

      const createdAt = validCreatedAt(raw?.createdAt)
      cleaned.push(createdAt ? { ...parsed.data, createdAt } : parsed.data)
    }

    const goals = await prisma.$transaction(async tx => {
      await tx.goal.deleteMany({ where: { userId: req.user.id } })
      for (const item of cleaned) {
        await tx.goal.create({ data: { userId: req.user.id, ...item } })
      }
      return tx.goal.findMany({
        where: { userId: req.user.id },
        orderBy: [{ createdAt: 'asc' }],
      })
    })

    return res.json({ goals: goals.map(publicGoal) })
  } catch (error) {
    next(error)
  }
})

export default router
