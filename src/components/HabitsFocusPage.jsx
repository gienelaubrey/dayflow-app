
import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Flame,
  Check,
  Target,
  Clock3,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  X,
  CalendarDays,
  Trophy,
} from 'lucide-react'

const HABIT_COLORS = [
  '#D783A2',
  '#9B8BD1',
  '#78A995',
  '#E1AA69',
  '#7F9FCB',
]

const DEFAULT_HABITS = [
  {
    id: 'habit-water',
    name: 'Drink enough water',
    icon: '💧',
    color: HABIT_COLORS[0],
    completedDates: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-reading',
    name: 'Read for 20 minutes',
    icon: '📚',
    color: HABIT_COLORS[1],
    completedDates: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'habit-walk',
    name: 'Take a short walk',
    icon: '🚶',
    color: HABIT_COLORS[2],
    completedDates: [],
    createdAt: new Date().toISOString(),
  },
]

function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDayLabel(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
  })
}

function getStreak(habit) {
  const completed = new Set(habit.completedDates || [])
  const today = new Date()
  let cursor = new Date(today)
  let streak = 0

  // If today's habit isn't completed yet, allow the streak
  // to continue from yesterday.
  if (!completed.has(getDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (completed.has(getDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))

    return {
      date,
      key: getDateKey(date),
      label: getDayLabel(date),
      day: date.getDate(),
    }
  })
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function HabitsFocusPage({
  habits = [],
  setHabits,
  focusSessions = [],
  setFocusSessions,
  view = 'all',
}) {
  const [habitName, setHabitName] = useState('')
  const [habitEmoji, setHabitEmoji] = useState('✨')
  const [showHabitForm, setShowHabitForm] = useState(false)

  const [focusMode, setFocusMode] = useState('focus')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [timerCompleted, setTimerCompleted] = useState(false)

  const today = getDateKey()
  const week = useMemo(() => getLastSevenDays(), [])
  const completedToday = habits.filter((habit) =>
    (habit.completedDates || []).includes(today)
  ).length

  const completionPercentage = habits.length
    ? Math.round((completedToday / habits.length) * 100)
    : 0

  const todayFocusMinutes = focusSessions
    .filter((session) => session.date === today)
    .reduce((total, session) => total + session.minutes, 0)

  const targetMinutes =
    focusMode === 'focus' ? focusMinutes : breakMinutes

  useEffect(() => {
    setRemainingSeconds(targetMinutes * 60)
    setIsRunning(false)
    setTimerCompleted(false)
  }, [targetMinutes])

  useEffect(() => {
    if (!isRunning) return

    const timerId = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId)
          setIsRunning(false)
          setTimerCompleted(true)

          if (focusMode === 'focus') {
            setFocusSessions((previousSessions) => [
              ...previousSessions,
              {
                id: crypto.randomUUID(),
                date: getDateKey(),
                minutes: focusMinutes,
                completedAt: new Date().toISOString(),
              },
            ])
          }

          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isRunning, focusMode, focusMinutes, setFocusSessions])

  function toggleHabit(habitId) {
    setHabits((previous) =>
      previous.map((habit) => {
        if (habit.id !== habitId) return habit

        const dates = habit.completedDates || []
        const isDone = dates.includes(today)

        return {
          ...habit,
          completedDates: isDone
            ? dates.filter((date) => date !== today)
            : [...dates, today],
        }
      })
    )
  }

  function addHabit(event) {
    event.preventDefault()

    const name = habitName.trim()
    if (!name) return

    setHabits((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name,
        icon: habitEmoji,
        color: HABIT_COLORS[previous.length % HABIT_COLORS.length],
        completedDates: [],
        createdAt: new Date().toISOString(),
      },
    ])

    setHabitName('')
    setHabitEmoji('✨')
    setShowHabitForm(false)
  }

  function deleteHabit(id) {
    if (!window.confirm('Delete this habit and its history?')) return

    setHabits((previous) =>
      previous.filter((habit) => habit.id !== id)
    )
  }

  function resetTimer() {
    setIsRunning(false)
    setTimerCompleted(false)
    setRemainingSeconds(targetMinutes * 60)
  }

  function changeMode(mode) {
    setFocusMode(mode)
    setIsRunning(false)
    setTimerCompleted(false)
  }

  const weekStats = week.map((day) => {
    const done = habits.filter((habit) =>
      (habit.completedDates || []).includes(day.key)
    ).length

    return {
      ...day,
      done,
      percentage: habits.length
        ? (done / habits.length) * 100
        : 0,
      isToday: day.key === today,
    }
  })

  const circumference = 2 * Math.PI * 92
  const progress = targetMinutes > 0
    ? remainingSeconds / (targetMinutes * 60)
    : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <main className="habits-page">
      <header className="habits-header">
        <div>
        <p className="habits-eyebrow">SMALL STEPS, EVERY DAY</p>
        <h1>
             {view === 'habits'
            ? 'Daily Habits'
            : view === 'focus'
            ? 'Time Tracker'
            : 'Habits & Focus'}
            <span>.</span>
        </h1>
          <p className="habits-subtitle">
            Build routines that support the life you want.
          </p>
        </div>

        <div className="habits-date">
          <CalendarDays size={17} />
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </header>
    
    {view !== 'focus' && (
      <section className="habits-stats">
        <article className="habit-stat-card">
          <div className="habit-stat-icon pink">
            <Target size={20} />
          </div>
          <div>
            <p>Today's habits</p>
            <h2>{completedToday}<span> / {habits.length}</span></h2>
          </div>
        </article>

        <article className="habit-stat-card">
          <div className="habit-stat-icon purple">
            <Clock3 size={20} />
          </div>
          <div>
            <p>Focus minutes today</p>
            <h2>{todayFocusMinutes}<span> min</span></h2>
          </div>
        </article>

        <article className="habit-stat-card">
          <div className="habit-stat-icon orange">
            <Flame size={20} />
          </div>
          <div>
            <p>Habits completed</p>
            <h2>{completionPercentage}<span>%</span></h2>
          </div>
        </article>
      </section>
    )}
        <div className={`habits-layout ${view === 'focus' ? 'focus-only-layout' : ''}`}>      
        {view !== 'focus' && (
        <section className="habits-panel">
          <div className="habits-section-heading">
            <div>
              <p className="habits-eyebrow">YOUR ROUTINE</p>
              <h2>Daily habits</h2>
              <p>Show up for yourself today.</p>
            </div>

            <button
              className="habits-add-button"
              onClick={() => setShowHabitForm((value) => !value)}
            >
              {showHabitForm ? <X size={17} /> : <Plus size={17} />}
              {showHabitForm ? 'Cancel' : 'Add habit'}
            </button>
          </div>

          {showHabitForm && (
            <form className="habit-create-form" onSubmit={addHabit}>
              <label>
                Habit name
                <input
                  value={habitName}
                  onChange={(event) => setHabitName(event.target.value)}
                  placeholder="e.g. Practice coding"
                  maxLength={80}
                  autoFocus
                />
              </label>

              <label>
                Icon
                <select
                  value={habitEmoji}
                  onChange={(event) => setHabitEmoji(event.target.value)}
                >
                  <option value="✨">✨ Sparkle</option>
                  <option value="💧">💧 Water</option>
                  <option value="📚">📚 Reading</option>
                  <option value="💻">💻 Coding</option>
                  <option value="🧘">🧘 Meditation</option>
                  <option value="🏃">🏃 Exercise</option>
                  <option value="📝">📝 Journaling</option>
                  <option value="🌱">🌱 Self-care</option>
                </select>
              </label>

              <button
                className="habits-submit-button"
                type="submit"
                disabled={!habitName.trim()}
              >
                Save habit
              </button>
            </form>
          )}

          <div className="habit-list">
            {habits.map((habit) => {
              const done = (habit.completedDates || []).includes(today)
              const streak = getStreak(habit)

              return (
                <article
                  className={`habit-row ${done ? 'completed' : ''}`}
                  key={habit.id}
                >
                  <button
                    className={`habit-check ${done ? 'checked' : ''}`}
                    onClick={() => toggleHabit(habit.id)}
                    aria-label={done ? 'Mark incomplete' : 'Complete habit'}
                  >
                    {done && <Check size={17} />}
                  </button>

                  <div
                    className="habit-emoji"
                    style={{ backgroundColor: `${habit.color || HABIT_COLORS[0]}20` }}
                  >
                    {habit.icon || '✨'}
                  </div>

                  <div className="habit-details">
                    <h3>{habit.name}</h3>
                    <p>
                      <Flame size={13} />
                      {streak} day{streak === 1 ? '' : 's'} streak
                    </p>
                  </div>

                  <span className={`habit-status ${done ? 'done' : ''}`}>
                    {done ? 'Completed' : 'Not yet'}
                  </span>

                  <button
                    className="habit-delete"
                    onClick={() => deleteHabit(habit.id)}
                    title="Delete habit"
                    aria-label={`Delete ${habit.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              )
            })}

            {habits.length === 0 && (
              <div className="habits-empty">
                <span>🌷</span>
                <h3>Start with one small habit</h3>
                <p>Add a habit you want to practice consistently.</p>
                <button
                  className="habits-add-button"
                  onClick={() => setShowHabitForm(true)}
                >
                  <Plus size={17} /> Add your first habit
                </button>
              </div>
            )}
          </div>
        </section>
        )}
        
        {view !== 'habits' && (
        <section className="focus-panel">
          <div className="focus-heading">
            <div>
              <p className="habits-eyebrow">MAKE SPACE TO THINK</p>
              <h2>Focus timer</h2>
            </div>
            <div className="focus-heading-icon">
              {focusMode === 'focus'
                ? <Brain size={20} />
                : <Coffee size={20} />}
            </div>
          </div>

          <div className="focus-mode-switch">
            <button
              className={focusMode === 'focus' ? 'active' : ''}
              onClick={() => changeMode('focus')}
            >
              <Brain size={15} /> Focus
            </button>
            <button
              className={focusMode === 'break' ? 'active' : ''}
              onClick={() => changeMode('break')}
            >
              <Coffee size={15} /> Break
            </button>
          </div>

          <div className="focus-timer-circle">
            <svg viewBox="0 0 210 210" aria-hidden="true">
              <circle
                cx="105"
                cy="105"
                r="92"
                fill="none"
                stroke="#f5e8ee"
                strokeWidth="9"
              />
              <circle
                cx="105"
                cy="105"
                r="92"
                fill="none"
                stroke={focusMode === 'focus' ? '#D783A2' : '#91BBA9'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 105 105)"
                className="focus-progress-ring"
              />
            </svg>

            <div className="focus-timer-display">
              <strong>{formatDuration(remainingSeconds)}</strong>
              <span>
                {timerCompleted
                  ? 'Session complete!'
                  : focusMode === 'focus'
                    ? 'Time to focus'
                    : 'Take a breath'}
              </span>
            </div>
          </div>

          <div className="focus-duration-settings">
            <label>
              Focus
              <select
                value={focusMinutes}
                onChange={(event) => {
                  setFocusMinutes(Number(event.target.value))
                }}
                disabled={isRunning}
              >
                <option value={15}>15 min</option>
                <option value={25}>25 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </label>

            <label>
              Break
              <select
                value={breakMinutes}
                onChange={(event) => {
                  setBreakMinutes(Number(event.target.value))
                }}
                disabled={isRunning}
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
              </select>
            </label>
          </div>

          <div className="focus-controls">
            <button
              className="focus-reset-button"
              onClick={resetTimer}
              aria-label="Reset timer"
            >
              <RotateCcw size={18} />
            </button>

            <button
              className="focus-start-button"
              onClick={() => {
                if (timerCompleted) {
                  setRemainingSeconds(targetMinutes * 60)
                  setTimerCompleted(false)
                }
                setIsRunning((value) => !value)
              }}
            >
              {isRunning ? <Pause size={19} /> : <Play size={19} />}
              {isRunning ? 'Pause' : timerCompleted ? 'Start again' : 'Start focus'}
            </button>
          </div>

          <p className="focus-tip">
            {focusMode === 'focus'
              ? 'One thing at a time. You are doing enough.'
              : 'Rest is part of being productive, too.'}
          </p>
        </section>
        )}
      </div>
    
    {view !== 'focus' && (
      <section className="weekly-panel">
        <div className="habits-section-heading">
          <div>
            <p className="habits-eyebrow">YOUR CONSISTENCY</p>
            <h2>This week</h2>
            <p>Every check is a little win.</p>
          </div>

          <div className="weekly-legend">
            <Trophy size={16} />
            {weekStats.reduce((sum, day) => sum + day.done, 0)} completions
          </div>
        </div>

        <div className="weekly-grid">
          {weekStats.map((day) => (
            <div
              className={`weekly-day ${day.isToday ? 'today' : ''}`}
              key={day.key}
            >
              <span className="weekly-day-name">{day.label}</span>
              <span className="weekly-day-number">{day.day}</span>

              <div className="weekly-bar-track">
                <div
                  className="weekly-bar-fill"
                  style={{ height: `${day.percentage}%` }}
                />
              </div>

              <span className="weekly-day-count">
                {day.done}/{habits.length}
              </span>
            </div>
          ))}
        </div>
      </section>
    )}
    </main>
  )
}
