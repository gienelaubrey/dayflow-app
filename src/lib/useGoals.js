import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeGoals } from './data.js'

function readLocalGoals(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'goals'))
    return normalizeGoals(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:goals-api-migrated-v1`
}

export default function useGoals(userId) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/goals')
    const normalized = normalizeGoals(body?.goals)
    setGoals(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/goals')
        let remoteGoals = normalizeGoals(body?.goals)

        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localGoals = readLocalGoals(userId)
          if (remoteGoals.length === 0 && localGoals.length > 0) {
            const imported = await apiRequest('/api/goals', {
              method: 'PUT',
              body: JSON.stringify({ goals: localGoals }),
            })
            remoteGoals = normalizeGoals(imported?.goals)
          }
          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setGoals(remoteGoals)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load goals.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createGoal = useCallback(async input => {
    setError('')
    try {
      const body = await apiRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const goal = normalizeGoals([body?.goal])[0]
      if (!goal) throw new Error('The server returned an invalid goal.')
      setGoals(current => [...current, goal])
      return goal
    } catch (err) {
      setError(err?.message || 'Could not create the goal.')
      throw err
    }
  }, [])

  const updateGoal = useCallback(async (id, patch) => {
    setError('')
    try {
      const body = await apiRequest(`/api/goals/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const goal = normalizeGoals([body?.goal])[0]
      if (!goal) throw new Error('The server returned an invalid goal.')
      setGoals(current => current.map(item => item.id === id ? goal : item))
      return goal
    } catch (err) {
      setError(err?.message || 'Could not update the goal.')
      throw err
    }
  }, [])

  const deleteGoal = useCallback(async id => {
    setError('')
    try {
      await apiRequest(`/api/goals/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setGoals(current => current.filter(goal => goal.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the goal.')
      throw err
    }
  }, [])

  const replaceGoals = useCallback(async value => {
    const normalized = normalizeGoals(value)
    setError('')
    try {
      const body = await apiRequest('/api/goals', {
        method: 'PUT',
        body: JSON.stringify({ goals: normalized }),
      })
      const next = normalizeGoals(body?.goals)
      setGoals(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace goals.')
      throw err
    }
  }, [userId])

  return {
    goals,
    loading,
    error,
    refresh,
    createGoal,
    updateGoal,
    deleteGoal,
    replaceGoals,
  }
}
