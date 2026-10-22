import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const CATEGORIES = new Set(['Personal', 'Study', 'Coding', 'Work', 'Ideas'])

function publicNote(note) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    category: note.category,
    favorite: note.favorite,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function noteData(body, { partial = false } = {}) {
  const data = {}

  const hasTitle = Object.hasOwn(body ?? {}, 'title')
  const hasContent = Object.hasOwn(body ?? {}, 'content')

  if (!partial || hasTitle || hasContent) {
    const title = hasTitle ? cleanText(body.title, 200) : undefined
    const content = hasContent ? cleanText(body.content, 20000) : undefined

    if (!partial) {
      const finalContent = content ?? ''
      const finalTitle = title || 'Untitled note'
      if (!title && !finalContent) return { error: 'Enter a note title or content.' }
      data.title = finalTitle
      data.content = finalContent
    } else {
      if (hasTitle) data.title = title || 'Untitled note'
      if (hasContent) data.content = content ?? ''
    }
  }

  if (!partial || Object.hasOwn(body ?? {}, 'category')) {
    const category = body?.category ?? 'Personal'
    if (!CATEGORIES.has(category)) return { error: 'Choose a valid note category.' }
    data.category = category
  }

  if (!partial || Object.hasOwn(body ?? {}, 'favorite')) {
    if (partial && typeof body.favorite !== 'boolean') {
      return { error: 'Favorite status must be true or false.' }
    }
    data.favorite = partial ? body.favorite : Boolean(body?.favorite)
  }

  if (!partial || Object.hasOwn(body ?? {}, 'pinned')) {
    if (partial && typeof body.pinned !== 'boolean') {
      return { error: 'Pinned status must be true or false.' }
    }
    data.pinned = partial ? body.pinned : Boolean(body?.pinned)
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: 'No note changes were provided.' }
  }

  return { data }
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function findOwnedNote(userId, id) {
  return prisma.note.findFirst({ where: { id, userId } })
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return res.json({ notes: notes.map(publicNote) })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = noteData(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const note = await prisma.note.create({
      data: { userId: req.user.id, ...parsed.data },
    })

    return res.status(201).json({ note: publicNote(note) })
  } catch (error) {
    next(error)
  }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await findOwnedNote(req.user.id, req.params.id)
    if (!existing) return res.status(404).json({ error: 'Note not found.' })

    const parsed = noteData(req.body, { partial: true })
    if (parsed.error) return res.status(400).json({ error: parsed.error })

    const nextTitle = parsed.data.title ?? existing.title
    const nextContent = parsed.data.content ?? existing.content
    if (!String(nextTitle).trim() && !String(nextContent).trim()) {
      return res.status(400).json({ error: 'A note cannot be completely empty.' })
    }

    const note = await prisma.note.update({
      where: { id: existing.id },
      data: parsed.data,
    })

    return res.json({ note: publicNote(note) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.note.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })

    if (result.count === 0) return res.status(404).json({ error: 'Note not found.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Replace the signed-in user's complete note collection.
// Used for backup restore and one-time migration from localStorage.
router.put('/', requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.notes)) {
      return res.status(400).json({ error: 'Notes must be an array.' })
    }

    if (req.body.notes.length > 2000) {
      return res.status(413).json({ error: 'A maximum of 2000 notes can be restored at once.' })
    }

    const cleaned = []
    for (const raw of req.body.notes) {
      const parsed = noteData(raw)
      if (parsed.error) return res.status(400).json({ error: parsed.error })

      const createdAt = parseTimestamp(raw?.createdAt)
      const updatedAt = parseTimestamp(raw?.updatedAt)

      cleaned.push({
        ...parsed.data,
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
      })
    }

    const notes = await prisma.$transaction(async tx => {
      await tx.note.deleteMany({ where: { userId: req.user.id } })

      for (const item of cleaned) {
        await tx.note.create({ data: { userId: req.user.id, ...item } })
      }

      return tx.note.findMany({
        where: { userId: req.user.id },
        orderBy: [
          { pinned: 'desc' },
          { updatedAt: 'desc' },
        ],
      })
    })

    return res.json({ notes: notes.map(publicNote) })
  } catch (error) {
    next(error)
  }
})

export default router
