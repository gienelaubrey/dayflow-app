export function dateKey(date = new Date()) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(time) {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length < 2) return time
  const [hour, minute] = parts.map(Number)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function habitStreak(habit) {
  const completed = new Set(habit?.completedDates || [])
  const today = new Date()
  let cursor = new Date(today)
  let streak = 0

  if (!completed.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (completed.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function overallStreak(habits = []) {
  if (!habits || habits.length === 0) return 0
  const streaks = habits.map(h => habitStreak(h))
  return streaks.length ? Math.max(...streaks) : 0
}