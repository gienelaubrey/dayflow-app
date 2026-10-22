import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeHabits } from './data.js'

function readLocalHabits(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'habits'))
    return normalizeHabits(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:habits-api-migrated-v1`
}

export default function useHabits(userId) {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/habits')
    const normalized = normalizeHabits(body?.habits)
    setHabits(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/habits')
        let remoteHabits = normalizeHabits(body?.habits)

        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localHabits = readLocalHabits(userId)
          if (remoteHabits.length === 0 && localHabits.length > 0) {
            const imported = await apiRequest('/api/habits', {
              method: 'PUT',
              body: JSON.stringify({ habits: localHabits }),
            })
            remoteHabits = normalizeHabits(imported?.habits)
          }
          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setHabits(remoteHabits)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load habits.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createHabit = useCallback(async input => {
    setError('')
    try {
      const body = await apiRequest('/api/habits', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const habit = normalizeHabits([body?.habit])[0]
      if (!habit) throw new Error('The server returned an invalid habit.')
      setHabits(current => [...current, habit])
      return habit
    } catch (err) {
      setError(err?.message || 'Could not create the habit.')
      throw err
    }
  }, [])

  const updateHabit = useCallback(async (id, patch) => {
    setError('')
    try {
      const body = await apiRequest(`/api/habits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const habit = normalizeHabits([body?.habit])[0]
      if (!habit) throw new Error('The server returned an invalid habit.')
      setHabits(current => current.map(item => item.id === id ? habit : item))
      return habit
    } catch (err) {
      setError(err?.message || 'Could not update the habit.')
      throw err
    }
  }, [])

  const setHabitCompletion = useCallback(async (id, date, completed) => {
    setError('')
    try {
      const body = await apiRequest(`/api/habits/${encodeURIComponent(id)}/completion`, {
        method: 'PATCH',
        body: JSON.stringify({ date, completed }),
      })
      const habit = normalizeHabits([body?.habit])[0]
      if (!habit) throw new Error('The server returned an invalid habit.')
      setHabits(current => current.map(item => item.id === id ? habit : item))
      return habit
    } catch (err) {
      setError(err?.message || 'Could not update habit completion.')
      throw err
    }
  }, [])

  const toggleHabit = useCallback(async (id, date) => {
    const current = habits.find(habit => habit.id === id)
    if (!current) throw new Error('Habit not found.')
    const completed = !(current.completedDates || []).includes(date)
    return setHabitCompletion(id, date, completed)
  }, [habits, setHabitCompletion])

  const deleteHabit = useCallback(async id => {
    setError('')
    try {
      await apiRequest(`/api/habits/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setHabits(current => current.filter(habit => habit.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the habit.')
      throw err
    }
  }, [])

  const replaceHabits = useCallback(async value => {
    const normalized = normalizeHabits(value)
    setError('')
    try {
      const body = await apiRequest('/api/habits', {
        method: 'PUT',
        body: JSON.stringify({ habits: normalized }),
      })
      const next = normalizeHabits(body?.habits)
      setHabits(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace habits.')
      throw err
    }
  }, [userId])

  return {
    habits,
    loading,
    error,
    refresh,
    createHabit,
    updateHabit,
    setHabitCompletion,
    toggleHabit,
    deleteHabit,
    replaceHabits,
  }
}
