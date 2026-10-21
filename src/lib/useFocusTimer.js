import { useEffect } from 'react'
import { dateKey } from './dates.js'
import useStoredState from './useStoredState.js'

const DEFAULT_TIMER = {
  mode: 'focus',
  focusMinutes: 25,
  breakMinutes: 5,
  remainingSeconds: 25 * 60,
  isRunning: false,
  endsAt: null,
  timerCompleted: false,
  runId: null,
  recordedRunId: null,
  startedAt: null,
  sessionMinutes: null,
}

function clampMinutes(value, fallback) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes)) return fallback
  return Math.min(180, Math.max(1, Math.round(minutes)))
}

function normalizeTimer(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_TIMER }

  const mode = raw.mode === 'break' ? 'break' : 'focus'
  const focusMinutes = clampMinutes(raw.focusMinutes, 25)
  const breakMinutes = clampMinutes(raw.breakMinutes, 5)
  const targetMinutes = mode === 'focus' ? focusMinutes : breakMinutes
  const remaining = Number(raw.remainingSeconds)
  const remainingSeconds = Number.isFinite(remaining)
    ? Math.min(targetMinutes * 60, Math.max(0, Math.ceil(remaining)))
    : targetMinutes * 60
  const endsAt = Number(raw.endsAt)

  return {
    mode,
    focusMinutes,
    breakMinutes,
    remainingSeconds,
    isRunning: Boolean(raw.isRunning) && Number.isFinite(endsAt),
    endsAt: Number.isFinite(endsAt) ? endsAt : null,
    timerCompleted: Boolean(raw.timerCompleted),
    runId: typeof raw.runId === 'string' ? raw.runId : null,
    recordedRunId: typeof raw.recordedRunId === 'string' ? raw.recordedRunId : null,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
    sessionMinutes: Number.isFinite(Number(raw.sessionMinutes)) ? Number(raw.sessionMinutes) : null,
  }
}

function makeRunId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function useFocusTimer(storageKey, setFocusSessions) {
  const [timer, setTimer] = useStoredState(storageKey, DEFAULT_TIMER, normalizeTimer)
  const targetMinutes = timer.mode === 'focus' ? timer.focusMinutes : timer.breakMinutes

  useEffect(() => {
    if (!timer.isRunning || !timer.endsAt) return

    const tick = () => {
      setTimer(current => {
        if (!current.isRunning || !current.endsAt) return current

        const remainingSeconds = Math.max(
          0,
          Math.ceil((current.endsAt - Date.now()) / 1000),
        )

        if (remainingSeconds === 0) {
          return {
            ...current,
            remainingSeconds: 0,
            isRunning: false,
            endsAt: null,
            timerCompleted: true,
          }
        }

        if (remainingSeconds === current.remainingSeconds) return current
        return { ...current, remainingSeconds }
      })
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [timer.isRunning, timer.endsAt, setTimer])

  useEffect(() => {
    if (
      !timer.timerCompleted ||
      timer.mode !== 'focus' ||
      !timer.runId ||
      timer.recordedRunId === timer.runId
    ) return

    const sessionId = timer.runId
    const minutes = timer.sessionMinutes || timer.focusMinutes

    setFocusSessions(previous => {
      if (previous.some(session => session.id === sessionId)) return previous
      return [
        ...previous,
        {
          id: sessionId,
          date: dateKey(),
          minutes,
          completedAt: new Date().toISOString(),
        },
      ]
    })

    setTimer(current => current.runId === sessionId
      ? { ...current, recordedRunId: sessionId }
      : current)
  }, [
    timer.timerCompleted,
    timer.mode,
    timer.runId,
    timer.recordedRunId,
    timer.sessionMinutes,
    timer.focusMinutes,
    setFocusSessions,
    setTimer,
  ])

  function resetTimer() {
    setTimer(current => {
      const minutes = current.mode === 'focus' ? current.focusMinutes : current.breakMinutes
      return {
        ...current,
        remainingSeconds: minutes * 60,
        isRunning: false,
        endsAt: null,
        timerCompleted: false,
        runId: null,
        recordedRunId: null,
        startedAt: null,
        sessionMinutes: null,
      }
    })
  }

  function changeMode(mode) {
    setTimer(current => {
      const nextMode = mode === 'break' ? 'break' : 'focus'
      const minutes = nextMode === 'focus' ? current.focusMinutes : current.breakMinutes
      return {
        ...current,
        mode: nextMode,
        remainingSeconds: minutes * 60,
        isRunning: false,
        endsAt: null,
        timerCompleted: false,
        runId: null,
        recordedRunId: null,
        startedAt: null,
        sessionMinutes: null,
      }
    })
  }

  function setFocusMinutes(minutes) {
    const nextMinutes = clampMinutes(minutes, 25)
    setTimer(current => ({
      ...current,
      focusMinutes: nextMinutes,
      ...(current.mode === 'focus' ? {
        remainingSeconds: nextMinutes * 60,
        isRunning: false,
        endsAt: null,
        timerCompleted: false,
        runId: null,
        recordedRunId: null,
        startedAt: null,
        sessionMinutes: null,
      } : {}),
    }))
  }

  function setBreakMinutes(minutes) {
    const nextMinutes = clampMinutes(minutes, 5)
    setTimer(current => ({
      ...current,
      breakMinutes: nextMinutes,
      ...(current.mode === 'break' ? {
        remainingSeconds: nextMinutes * 60,
        isRunning: false,
        endsAt: null,
        timerCompleted: false,
        runId: null,
        recordedRunId: null,
        startedAt: null,
        sessionMinutes: null,
      } : {}),
    }))
  }

  function toggleRunning() {
    setTimer(current => {
      if (current.isRunning && current.endsAt) {
        const remainingSeconds = Math.max(
          0,
          Math.ceil((current.endsAt - Date.now()) / 1000),
        )
        return {
          ...current,
          remainingSeconds,
          isRunning: false,
          endsAt: null,
        }
      }

      const minutes = current.mode === 'focus' ? current.focusMinutes : current.breakMinutes
      const startingFresh = current.timerCompleted || !current.runId || current.remainingSeconds <= 0
      const remainingSeconds = startingFresh ? minutes * 60 : current.remainingSeconds

      return {
        ...current,
        remainingSeconds,
        isRunning: true,
        endsAt: Date.now() + remainingSeconds * 1000,
        timerCompleted: false,
        runId: startingFresh ? makeRunId() : current.runId,
        recordedRunId: startingFresh ? null : current.recordedRunId,
        startedAt: startingFresh ? new Date().toISOString() : current.startedAt,
        sessionMinutes: startingFresh ? minutes : current.sessionMinutes,
      }
    })
  }

  return {
    ...timer,
    targetMinutes,
    resetTimer,
    changeMode,
    setFocusMinutes,
    setBreakMinutes,
    toggleRunning,
  }
}
