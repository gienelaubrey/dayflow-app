import { useCallback, useEffect, useRef, useState } from 'react'

const identity = value => value

export default function useStoredState(key, initialValue, normalize = identity) {
  const normalizerRef = useRef(normalize)
  normalizerRef.current = normalize

  const [state, setState] = useState(() => {
    const fallback = typeof initialValue === 'function' ? initialValue() : initialValue

    try {
      const item = localStorage.getItem(key)
      return normalizerRef.current(item ? JSON.parse(item) : fallback)
    } catch {
      return normalizerRef.current(fallback)
    }
  })

  const setNormalizedState = useCallback(update => {
    setState(current => {
      const next = typeof update === 'function' ? update(current) : update
      return normalizerRef.current(next)
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error)
    }
  }, [key, state])

  return [state, setNormalizedState]
}
