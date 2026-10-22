import { useCallback, useEffect, useState } from 'react'
import { apiRequest, dataKey } from './auth.js'
import { normalizeNotes } from './data.js'

function readLocalNotes(userId) {
  try {
    const value = localStorage.getItem(dataKey(userId, 'notes'))
    return normalizeNotes(value ? JSON.parse(value) : [])
  } catch {
    return []
  }
}

function migrationKey(userId) {
  return `dayflow:${userId}:notes-api-migrated-v1`
}

export default function useNotes(userId) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const body = await apiRequest('/api/notes')
    const normalized = normalizeNotes(body?.notes)
    setNotes(normalized)
    return normalized
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const body = await apiRequest('/api/notes')
        let remoteNotes = normalizeNotes(body?.notes)

        // Import old browser notes once, but never overwrite existing cloud notes.
        const marker = migrationKey(userId)
        const alreadyMigrated = localStorage.getItem(marker) === '1'

        if (!alreadyMigrated) {
          const localNotes = readLocalNotes(userId)
          if (remoteNotes.length === 0 && localNotes.length > 0) {
            const imported = await apiRequest('/api/notes', {
              method: 'PUT',
              body: JSON.stringify({ notes: localNotes }),
            })
            remoteNotes = normalizeNotes(imported?.notes)
          }
          localStorage.setItem(marker, '1')
        }

        if (!cancelled) setNotes(remoteNotes)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load notes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createNote = useCallback(async input => {
    setError('')
    try {
      const body = await apiRequest('/api/notes', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      const note = normalizeNotes([body?.note])[0]
      if (!note) throw new Error('The server returned an invalid note.')
      setNotes(current => [note, ...current])
      return note
    } catch (err) {
      setError(err?.message || 'Could not create the note.')
      throw err
    }
  }, [])

  const updateNote = useCallback(async (id, patch) => {
    setError('')
    try {
      const body = await apiRequest(`/api/notes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const note = normalizeNotes([body?.note])[0]
      if (!note) throw new Error('The server returned an invalid note.')
      setNotes(current => current.map(item => item.id === id ? note : item))
      return note
    } catch (err) {
      setError(err?.message || 'Could not update the note.')
      throw err
    }
  }, [])

  const deleteNote = useCallback(async id => {
    setError('')
    try {
      await apiRequest(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setNotes(current => current.filter(note => note.id !== id))
    } catch (err) {
      setError(err?.message || 'Could not delete the note.')
      throw err
    }
  }, [])

  const replaceNotes = useCallback(async value => {
    const normalized = normalizeNotes(value)
    setError('')

    try {
      const body = await apiRequest('/api/notes', {
        method: 'PUT',
        body: JSON.stringify({ notes: normalized }),
      })
      const next = normalizeNotes(body?.notes)
      setNotes(next)
      localStorage.setItem(migrationKey(userId), '1')
      return next
    } catch (err) {
      setError(err?.message || 'Could not replace notes.')
      throw err
    }
  }, [userId])

  return {
    notes,
    loading,
    error,
    refresh,
    createNote,
    updateNote,
    deleteNote,
    replaceNotes,
  }
}
