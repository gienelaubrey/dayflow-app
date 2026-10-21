import { useState, useEffect } from 'react'

export default function useStoredState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : (typeof initialValue === 'function' ? initialValue() : initialValue)
    } catch {
      return typeof initialValue === 'function' ? initialValue() : initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.error(`Failed to save ${key} to localStorage:`, e)
    }
  }, [key, state])

  return [state, setState]
}