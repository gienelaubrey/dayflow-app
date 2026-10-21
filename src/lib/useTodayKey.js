import { useEffect, useState } from 'react'
import { dateKey } from './dates.js'

export default function useTodayKey() {
  const [today, setToday] = useState(() => dateKey())

  useEffect(() => {
    const refresh = () => setToday(dateKey())
    const timerId = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(timerId)
  }, [])

  return today
}
