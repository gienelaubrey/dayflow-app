import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeEvents } from './data.js'

function readLocalEvents(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'events'))
    return normalizeEvents(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:events-api-migrated-v1`
}

export default function useEvents(userId) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/events')
    const normalized = normalizeEvents(body?.events)
    setEvents(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/events')
        let remoteEvents = normalizeEvents(body?.events)

        // Import old browser events exactly once and only if the cloud collection is empty.
        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localEvents = readLocalEvents(userId)

          if (remoteEvents.length === 0 && localEvents.length > 0) {
            const imported = await apiRequest('/api/events', {
              method: 'PUT',
              body: JSON.stringify({ events: localEvents }),
            })
            remoteEvents = normalizeEvents(imported?.events)
          }

          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setEvents(remoteEvents)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load calendar events.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createEvent = useCallback(async input => {
    setError('')

    try {
      const body = await apiRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify(input),
      })

      const event = normalizeEvents([body?.event])[0]
      if (!event) throw new Error('The server returned an invalid event.')

      setEvents(current => [...current, event])
      return event
    } catch (err) {
      setError(err?.message || 'Could not create the event.')
      throw err
    }
  }, [])

  const updateEvent = useCallback(async (id, patch) => {
    setError('')

    try {
      const body = await apiRequest(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })

      const event = normalizeEvents([body?.event])[0]
      if (!event) throw new Error('The server returned an invalid event.')

      setEvents(current => current.map(item => item.id === id ? event : item))
      return event
    } catch (err) {
      setError(err?.message || 'Could not update the event.')
      throw err
    }
  }, [])

  const deleteEvent = useCallback(async id => {
    setError('')

    try {
      await apiRequest(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setEvents(current => current.filter(event => event.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the event.')
      throw err
    }
  }, [])

  const replaceEvents = useCallback(async value => {
    const normalized = normalizeEvents(value)
    setError('')

    try {
      const body = await apiRequest('/api/events', {
        method: 'PUT',
        body: JSON.stringify({ events: normalized }),
      })

      const next = normalizeEvents(body?.events)
      setEvents(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace calendar events.')
      throw err
    }
  }, [userId])

  return {
    events,
    loading,
    error,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    replaceEvents,
  }
}
