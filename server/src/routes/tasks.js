import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const PRIORITIES = new Set(['Low', 'Medium', 'High'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function dateString(value) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function publicTask(task) {
  const dueDate = dateString(task.dueDate)
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate,
    time: dueDate || 'No date set',
    done: task.done,
  }
}

function parseDate(value) {
  if (value === undefined) return { provided: false }
  if (value === null || value === '') return { provided: true, value: null }
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { provided: true, error: 'Due date must use YYYY-MM-DD.' }
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { provided: true, error: 'Enter a valid due date.' }
  }

  return { provided: true, value: parsed }
}

function taskData(body, { partial = false } = {}) {
  const data = {}

  if (!partial || Object.hasOwn(body ?? {}, 'title')) {
    const title = String(body?.title ?? '').trim()
    if (!title) return { error: 'Enter a task title.' }
    if (title.length > 150) return { error: 'Task title must be 150 characters or fewer.' }
    data.title = title
  }

  if (!partial || Object.hasOwn(body ?? {}, 'description')) {
    const description = String(body?.description ?? '').trim()
    if (description.length > 2000) {
      return { error: 'Task description must be 2000 characters or fewer.' }
    }
    data.description = description
  }

  if (!partial || Object.hasOwn(body ?? {}, 'priority')) {
    const priority = body?.priority ?? 'Medium'
    if (!PRIORITIES.has(priority)) return { error: 'Choose a valid task priority.' }
    data.priority = priority
  }

  const dueDate = parseDate(body?.dueDate)
  if (dueDate.error) return { error: dueDate.error }
  if (!partial || dueDate.provided) data.dueDate = dueDate.value ?? null

  if (!partial || Object.hasOwn(body ?? {}, 'done')) {
    if (partial && typeof body.done !== 'boolean') {
      return { error: 'Task completion status must be true or false.' }
    }
    data.done = partial ? body.done : Boolean(body?.done)
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: 'No task changes were provided.' }
  }

  return { data }
}

async function findOwnedTask(userId, id) {
  return prisma.task.findFirst({ where: { id, userId } })
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: [{ createdAt: 'asc' }],
    })
    return res.json({ tasks: tasks.map(publicTask) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = taskData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const task = await prisma.task.create({
      data: { userId: req.user.id, ...parsed.data },
    })
    return res.status(201).json({ task: publicTask(task) })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedTask(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Task not found.' })

    const parsed = taskData(req.body, { partial: true })
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: parsed.data,
    })
    return res.json({ task: publicTask(task) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.task.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (result.count === 0) return res.status(404).json({ error: 'Task not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace the signed-in user's complete task collection.
// This powers backup restore and one-time migration from the old localStorage store.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.tasks)) {
      return res.status(400).json({ error: 'Tasks must be an array.' })
    }
    if (req.body.tasks.length > 1000) {
      return res.status(413).json({ error: 'A maximum of 1000 tasks can be restored at once.' })
    }

    const cleaned = []
    for (const raw of req.body.tasks) {
      const parsed = taskData(raw)
      if (parsed.error) return res.status(400).json({ error: parsed.error })
      cleaned.push(parsed.data)
    }

    const tasks = await prisma.$transaction(async tx => {
      await tx.task.deleteMany({ where: { userId: req.user.id } })
      for (const item of cleaned) {
        await tx.task.create({ data: { userId: req.user.id, ...item } })
      }
      return tx.task.findMany({
        where: { userId: req.user.id },
        orderBy: [{ createdAt: 'asc' }],
      })
    })

    return res.json({ tasks: tasks.map(publicTask) })
  } catch (error) {
    next(error)
  }
})

export default router
