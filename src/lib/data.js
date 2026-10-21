const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/

const TASK_PRIORITIES = new Set(['Low', 'Medium', 'High'])
const EVENT_CATEGORIES = new Set(['Personal', 'Work', 'Study', 'Interview', 'Health', 'Other'])
const NOTE_CATEGORIES = new Set(['Personal', 'Study', 'Coding', 'Work', 'Ideas'])
const GOAL_CATEGORIES = new Set(['Personal', 'Career', 'Health', 'Learning', 'Finance'])

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `dayflow-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value, maxLength = Infinity) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeId(value) {
  return text(value, 200) || makeId()
}

function safeDate(value) {
  const candidate = text(value, 10)
  if (!DATE_RE.test(candidate)) return ''
  const date = new Date(`${candidate}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '' : candidate
}

function safeTime(value, fallback) {
  const candidate = text(value, 5)
  return TIME_RE.test(candidate) ? candidate : fallback
}

function safeIso(value, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) return fallback
  return Number.isNaN(Date.parse(value)) ? fallback : value
}

function dedupeById(items) {
  const seen = new Set()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function addHour(time) {
  const [hour, minute] = time.split(':').map(Number)
  const nextHour = Math.min(hour + 1, 23)
  if (nextHour === hour) return '23:59'
  return `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function normalizeTasks(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const title = text(raw.title, 150)
    if (!title) return []

    const dueDate = safeDate(raw.dueDate)
    const priority = TASK_PRIORITIES.has(raw.priority) ? raw.priority : 'Medium'

    return [{
      id: safeId(raw.id),
      title,
      description: text(raw.description, 2000),
      priority,
      dueDate,
      time: dueDate || 'No date set',
      done: Boolean(raw.done),
    }]
  })

  return dedupeById(items)
}

export function normalizeEvents(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const title = text(raw.title, 150)
    const date = safeDate(raw.date)
    if (!title || !date) return []

    const startTime = safeTime(raw.startTime, '09:00')
    let endTime = safeTime(raw.endTime, addHour(startTime))
    if (endTime <= startTime) endTime = addHour(startTime)

    return [{
      id: safeId(raw.id),
      title,
      date,
      startTime,
      endTime,
      category: EVENT_CATEGORIES.has(raw.category) ? raw.category : 'Personal',
      location: text(raw.location, 200),
      description: text(raw.description, 2000),
    }]
  })

  return dedupeById(items)
}

export function normalizeNotes(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const content = text(raw.content, 20000)
    let title = text(raw.title, 200)
    if (!title && content) title = content.length > 48 ? `${content.slice(0, 48)}…` : content
    if (!title && !content) return []

    const now = new Date().toISOString()
    const createdAt = safeIso(raw.createdAt, now)

    return [{
      id: safeId(raw.id),
      title: title || 'Untitled note',
      content,
      category: NOTE_CATEGORIES.has(raw.category) ? raw.category : 'Personal',
      favorite: Boolean(raw.favorite),
      pinned: Boolean(raw.pinned),
      createdAt,
      updatedAt: safeIso(raw.updatedAt, createdAt),
    }]
  })

  return dedupeById(items)
}

export function normalizeHabits(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const name = text(raw.name, 120)
    if (!name) return []

    const completedDates = Array.isArray(raw.completedDates)
      ? [...new Set(raw.completedDates.map(safeDate).filter(Boolean))].sort()
      : []

    return [{
      id: safeId(raw.id),
      name,
      icon: text(raw.icon, 8) || '✨',
      color: text(raw.color, 32) || '#D783A2',
      completedDates,
      createdAt: safeIso(raw.createdAt, new Date().toISOString()),
    }]
  })

  return dedupeById(items)
}

export function normalizeFocusSessions(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const date = safeDate(raw.date)
    const minutes = Number(raw.minutes)
    if (!date || !Number.isFinite(minutes) || minutes <= 0) return []

    return [{
      id: safeId(raw.id),
      date,
      minutes: Math.min(1440, Math.round(minutes)),
      completedAt: safeIso(raw.completedAt, new Date().toISOString()),
    }]
  })

  return dedupeById(items)
}

export function normalizeGoals(value) {
  if (!Array.isArray(value)) return []

  const items = value.flatMap(raw => {
    if (!isRecord(raw)) return []
    const title = text(raw.title, 160)
    if (!title) return []

    const progressValue = Number(raw.progress)
    const progress = Number.isFinite(progressValue)
      ? Math.min(100, Math.max(0, Math.round(progressValue)))
      : 0

    return [{
      id: safeId(raw.id),
      title,
      description: text(raw.description, 2000),
      category: GOAL_CATEGORIES.has(raw.category) ? raw.category : 'Personal',
      targetDate: safeDate(raw.targetDate),
      progress,
      createdAt: safeIso(raw.createdAt, new Date().toISOString()),
    }]
  })

  return dedupeById(items)
}

export const DATA_NORMALIZERS = {
  tasks: normalizeTasks,
  events: normalizeEvents,
  notes: normalizeNotes,
  habits: normalizeHabits,
  focusSessions: normalizeFocusSessions,
  goals: normalizeGoals,
}

export function normalizeBackupData(value) {
  if (!isRecord(value)) return {}

  const normalized = {}
  Object.entries(DATA_NORMALIZERS).forEach(([key, normalize]) => {
    if (Array.isArray(value[key])) normalized[key] = normalize(value[key])
  })
  return normalized
}
