import { useEffect, useLayoutEffect, useState } from 'react'

const THEME_KEY = 'dayflow-theme'
const THEMES = new Set(['light', 'dark', 'system'])

function readPreference() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return THEMES.has(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function useTheme() {
  const [theme, setThemeState] = useState(readPreference)
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    theme === 'system' ? systemTheme() : theme
  )

  useLayoutEffect(() => {
    const resolved = theme === 'system' ? systemTheme() : theme
    setResolvedTheme(resolved)
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [theme])

  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = event => {
      const resolved = event.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }

    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [theme])

  function setTheme(nextTheme) {
    if (!THEMES.has(nextTheme)) return
    setThemeState(nextTheme)
    try {
      localStorage.setItem(THEME_KEY, nextTheme)
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }
  }

  return { theme, resolvedTheme, setTheme }
}
