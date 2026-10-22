import { useMemo, useState } from 'react'
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
import { dateKey, habitStreak } from '../lib/dates.js'
import useTodayKey from '../lib/useTodayKey.js'

const HABIT_COLORS = [
  '#D783A2',
  '#9B8BD1',
  '#78A995',
  '#E1AA69',
  '#7F9FCB',
]

function getDayLabel(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
  })
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))

    return {
      date,
      key: dateKey(date),
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
  loading = false,
  error = '',
  onCreateHabit,
  onToggleHabit,
  onDeleteHabit,
  focusSessions = [],
  setFocusSessions,
  focusTimer,
  view = 'all',
}) {
  const [habitName, setHabitName] = useState('')
  const [habitEmoji, setHabitEmoji] = useState('✨')
  const [showHabitForm, setShowHabitForm] = useState(false)
  const [savingHabit, setSavingHabit] = useState(false)
  const today = useTodayKey()

  const {
    mode: focusMode,
    focusMinutes,
    breakMinutes,
    remainingSeconds,
    isRunning,
    timerCompleted,
    targetMinutes,
    resetTimer,
    changeMode,
    setFocusMinutes,
    setBreakMinutes,
    toggleRunning,
  } = focusTimer

  const week = useMemo(() => getLastSevenDays(), [today])
  const completedToday = habits.filter((habit) =>
    (habit.completedDates || []).includes(today)
  ).length

  const completionPercentage = habits.length
    ? Math.round((completedToday / habits.length) * 100)
    : 0

  const todayFocusMinutes = focusSessions
    .filter((session) => session.date === today)
    .reduce((total, session) => total + session.minutes, 0)

  function toggleHabit(habitId) {
    Promise.resolve(onToggleHabit?.(habitId, today)).catch(() => {})
  }

  async function addHabit(event) {
    event.preventDefault()

    const name = habitName.trim()
    if (!name || savingHabit) return

    setSavingHabit(true)
    try {
      await onCreateHabit?.({
        name,
        icon: habitEmoji,
        color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
      })
      setHabitName('')
      setHabitEmoji('✨')
      setShowHabitForm(false)
    } catch {
      // The shared error banner below displays the API error.
    } finally {
      setSavingHabit(false)
    }
  }

  function deleteHabit(id) {
    if (!window.confirm('Delete this habit and its history?')) return
    Promise.resolve(onDeleteHabit?.(id)).catch(() => {})
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

      {error && <div className="auth-error" role="alert">{error}</div>}
    
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
                disabled={!habitName.trim() || savingHabit}
              >
                {savingHabit ? 'Saving…' : 'Save habit'}
              </button>
            </form>
          )}

          <div className="habit-list">
            {loading && habits.length === 0 && (
              <p className="empty-state">Loading habits…</p>
            )}
            {habits.map((habit) => {
              const done = (habit.completedDates || []).includes(today)
              const streak = habitStreak(habit)

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

            {!loading && habits.length === 0 && (
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
              onClick={toggleRunning}
            >
              {isRunning ? <Pause size={19} /> : <Play size={19} />}
              {isRunning
                ? 'Pause'
                : timerCompleted
                  ? 'Start again'
                  : focusMode === 'focus' ? 'Start focus' : 'Start break'}
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