import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeTasks } from './data.js'

function readLocalTasks(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'tasks'))
    return normalizeTasks(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:tasks-api-migrated-v1`
}

export default function useTasks(userId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/tasks')
    const normalized = normalizeTasks(body?.tasks)
    setTasks(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/tasks')
        let remoteTasks = normalizeTasks(body?.tasks)

        // Import old browser tasks exactly once, but only when the server has no tasks yet.
        // This avoids overwriting cloud data on later visits.
        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localTasks = readLocalTasks(userId)
          if (remoteTasks.length === 0 && localTasks.length > 0) {
            const imported = await apiRequest('/api/tasks', {
              method: 'PUT',
              body: JSON.stringify({ tasks: localTasks }),
            })
            remoteTasks = normalizeTasks(imported?.tasks)
          }
          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setTasks(remoteTasks)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load tasks.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createTask = useCallback(async input => {
    setError('')
    try {
      const body = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const task = normalizeTasks([body?.task])[0]
      if (!task) throw new Error('The server returned an invalid task.')
      setTasks(current => [...current, task])
      return task
    } catch (err) {
      setError(err?.message || 'Could not create the task.')
      throw err
    }
  }, [])

  const updateTask = useCallback(async (id, patch) => {
    setError('')
    try {
      const body = await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const task = normalizeTasks([body?.task])[0]
      if (!task) throw new Error('The server returned an invalid task.')
      setTasks(current => current.map(item => item.id === id ? task : item))
      return task
    } catch (err) {
      setError(err?.message || 'Could not update the task.')
      throw err
    }
  }, [])

  const toggleTask = useCallback(async id => {
    const current = tasks.find(task => task.id === id)
    if (!current) return null
    return updateTask(id, { done: !current.done })
  }, [tasks, updateTask])

  const deleteTask = useCallback(async id => {
    setError('')
    try {
      await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setTasks(current => current.filter(task => task.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the task.')
      throw err
    }
  }, [])

  const replaceTasks = useCallback(async value => {
    const normalized = normalizeTasks(value)
    setError('')
    try {
      const body = await apiRequest('/api/tasks', {
        method: 'PUT',
        body: JSON.stringify({ tasks: normalized }),
      })
      const next = normalizeTasks(body?.tasks)
      setTasks(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace tasks.')
      throw err
    }
  }, [userId])

  return {
    tasks,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    replaceTasks,
  }
}
