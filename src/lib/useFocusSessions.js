import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeFocusSessions } from './data.js'

function readLocalFocusSessions(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'focus-sessions'))
    return normalizeFocusSessions(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:focus-sessions-api-migrated-v1`
}

export default function useFocusSessions(userId) {
  const [focusSessions, setFocusSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/focus-sessions')
    const normalized = normalizeFocusSessions(body?.focusSessions)
    setFocusSessions(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/focus-sessions')
        let remoteSessions = normalizeFocusSessions(body?.focusSessions)

        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localSessions = readLocalFocusSessions(userId)
          if (remoteSessions.length === 0 && localSessions.length > 0) {
            const imported = await apiRequest('/api/focus-sessions', {
              method: 'PUT',
              body: JSON.stringify({ focusSessions: localSessions }),
            })
            remoteSessions = normalizeFocusSessions(imported?.focusSessions)
          }
          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setFocusSessions(remoteSessions)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load focus history.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createFocusSession = useCallback(async input => {
    setError('')
    try {
      const body = await apiRequest('/api/focus-sessions', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const session = normalizeFocusSessions([body?.focusSession])[0]
      if (!session) throw new Error('The server returned an invalid focus session.')

      setFocusSessions(current => {
        const exists = current.some(item => item.id === session.id)
        return exists
          ? current.map(item => item.id === session.id ? session : item)
          : [...current, session]
      })
      return session
    } catch (err) {
      setError(err?.message || 'Could not save the focus session.')
      throw err
    }
  }, [])

  const deleteFocusSession = useCallback(async id => {
    setError('')
    try {
      await apiRequest(`/api/focus-sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setFocusSessions(current => current.filter(session => session.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the focus session.')
      throw err
    }
  }, [])

  const replaceFocusSessions = useCallback(async value => {
    const normalized = normalizeFocusSessions(value)
    setError('')
    try {
      const body = await apiRequest('/api/focus-sessions', {
        method: 'PUT',
        body: JSON.stringify({ focusSessions: normalized }),
      })
      const next = normalizeFocusSessions(body?.focusSessions)
      setFocusSessions(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace focus history.')
      throw err
    }
  }, [userId])

  return {
    focusSessions,
    loading,
    error,
    refresh,
    createFocusSession,
    deleteFocusSession,
    replaceFocusSessions,
  }
}
