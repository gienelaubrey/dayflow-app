import { useEffect, useState } from 'react'
import {
  House, CalendarDays, CheckSquare, NotebookPen,
  Sprout, Timer, Target, Settings, Search, Bell,
  Plus, Circle, CheckCircle2, Clock3, Flame,
  ChevronLeft, ChevronRight, Heart, Menu, X, Trash2, Flower2, Check,
} from 'lucide-react'

import TasksPage from './components/TasksPage.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import NotesPage from './components/NotesPage.jsx'
import HabitsFocusPage from './components/HabitsFocusPage.jsx'
import GoalsPage from './components/GoalsPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import AuthPage from './components/AuthPage.jsx'
import ProfileMenu from './components/ProfileMenu.jsx'

import useStoredState from './lib/useStoredState.js'
import useFocusTimer from './lib/useFocusTimer.js'
import useTodayKey from './lib/useTodayKey.js'
import { dataKey, getSessionUser, logout, updateProfile } from './lib/auth.js'
import { dateKey, formatTime, habitStreak, overallStreak } from './lib/dates.js'
import {
  normalizeTasks, normalizeEvents, normalizeNotes, normalizeHabits,
  normalizeFocusSessions, normalizeGoals,
} from './lib/data.js'

const navItems = [
  { label: 'Home', icon: House },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Tasks', icon: CheckSquare },
  { label: 'Notes', icon: NotebookPen },
  { label: 'Habits', icon: Sprout },
  { label: 'Time Tracker', icon: Timer },
  { label: 'Goals', icon: Target },
  { label: 'Settings', icon: Settings },
]

const EVENT_COLORS = {
  Personal: 'pink',
  Work: 'purple',
  Study: 'blue',
  Interview: 'orange',
  Health: 'green',
  Other: 'pink',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ icon: Icon, title, value, detail, percent }) {
  return (
    <section className="stat-card">
      <div className="stat-icon"><Icon size={23} /></div>
      <div className="stat-content">
        <p className="muted">{title}</p>
        <h2>{value}</h2>
        {percent !== undefined && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        )}
        {detail && <small className="muted">{detail}</small>}
      </div>
    </section>
  )
}

// Decides whether to show the login screen or the app.
export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking the session

  useEffect(() => {
    let cancelled = false
    getSessionUser().then(found => {
      if (!cancelled) setUser(found)
    })
    return () => { cancelled = true }
  }, [])

  if (user === undefined) return null
  if (user === null) return <AuthPage onAuthenticated={setUser} />

  return (
    <Workspace
      key={user.id}
      user={user}
      onUpdateProfile={async patch => setUser(await updateProfile(user.id, patch))}
      onLogout={async () => {
        await logout()
        setUser(null)
      }}
    />
  )
}

function Workspace({ user, onUpdateProfile, onLogout }) {
  const key = name => dataKey(user.id, name)

  const [tasks, setTasks] = useStoredState(key('tasks'), [], normalizeTasks)
  const [events, setEvents] = useStoredState(key('events'), [], normalizeEvents)
  const [notes, setNotes] = useStoredState(key('notes'), [], normalizeNotes)
  const [habits, setHabits] = useStoredState(key('habits'), [], normalizeHabits)
  const [focusSessions, setFocusSessions] = useStoredState(
    key('focus-sessions'), [], normalizeFocusSessions
  )
  const [goals, setGoals] = useStoredState(key('goals'), [], normalizeGoals)
  const focusTimer = useFocusTimer(key('focus-timer'), setFocusSessions)

  const [activePage, setActivePage] = useState('Home')
  const [calendarDate, setCalendarDate] = useState(null)
  const [newTask, setNewTask] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [quickNote, setQuickNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    if (!noteSaved) return
    const id = window.setTimeout(() => setNoteSaved(false), 2200)
    return () => window.clearTimeout(id)
  }, [noteSaved])

  const today = useTodayKey()
  const firstName = user.name.trim().split(/\s+/)[0] || user.name

  // Today shows active undated/overdue tasks plus tasks actually due today.
  // Completed tasks from older dates no longer linger on the Home dashboard.
  const todayTasks = tasks.filter(task => {
    if (task.done) return task.dueDate === today
    return !task.dueDate || task.dueDate <= today
  })
  const filteredTasks = todayTasks.filter(task =>
    (task.title || '').toLowerCase().includes(search.toLowerCase())
  )
  const completed = tasks.filter(task => task.done).length
  const overdueCount = tasks.filter(task =>
    task.dueDate && task.dueDate < today && !task.done
  ).length

  const focusMinutesToday = focusSessions
    .filter(session => session.date === today)
    .reduce((total, session) => total + (session.minutes || 0), 0)
  const goalsCompleted = goals.filter(goal => goal.progress >= 100).length
  const streak = overallStreak(habits)

  const todayEvents = events
    .filter(event => event.date === today)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  const todayDueTasks = tasks.filter(task => task.dueDate === today && !task.done)

  function addTask(e) {
    e.preventDefault()
    const title = newTask.trim()
    if (!title) return
    setTasks(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        title,
        description: '',
        priority: 'Medium',
        dueDate: today,
        time: today,
        done: false,
      },
    ])
    setNewTask('')
    setShowAddTask(false)
  }

  function toggleTask(id) {
    setTasks(current =>
      current.map(task => task.id === id ? { ...task, done: !task.done } : task)
    )
  }

  function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return
    setTasks(current => current.filter(task => task.id !== id))
  }

  function toggleHabit(id) {
    setHabits(current => current.map(habit => {
      if (habit.id !== id) return habit
      const dates = habit.completedDates || []
      return {
        ...habit,
        completedDates: dates.includes(today)
          ? dates.filter(date => date !== today)
          : [...dates, today],
      }
    }))
  }

  function saveQuickNote(e) {
    e.preventDefault()
    const text = quickNote.trim()
    if (!text) return
    const now = new Date().toISOString()
    setNotes(current => [
      {
        id: crypto.randomUUID(),
        title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
        content: text,
        category: 'Ideas',
        favorite: false,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ])
    setQuickNote('')
    setNoteSaved(true)
  }

  function changeMonth(offset) {
    setCurrentMonth(current =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    )
  }

  function openCalendarOn(day) {
    setCalendarDate(dateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)))
    setActivePage('Calendar')
  }

  function goTo(page) {
    setActivePage(page)
    setMobileMenu(false)
    if (page === 'Calendar') setCalendarDate(null)
  }

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const now = new Date()
  const isCurrentMonth =
    now.getFullYear() === currentMonth.getFullYear() &&
    now.getMonth() === currentMonth.getMonth()

  const busyDays = new Set([
    ...events.map(event => event.date),
    ...tasks.filter(task => task.dueDate && !task.done).map(task => task.dueDate),
  ])
  const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-`

  const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return dateKey(date)
  })

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button className="mobile-overlay" aria-label="Close menu"
          onClick={() => setMobileMenu(false)} />
      )}

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-flower"><Flower2 size={30} /></div>
          <div>
            <h1>DayFlow</h1>
            <p>Plan · Focus · Grow</p>
          </div>
          <button className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label}
              className={`nav-item ${activePage === label ? 'active' : ''}`}
              onClick={() => goTo(label)}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-quote">
          <Heart size={19} />
          <p>Small steps make big progress.</p>
          <span>♡</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-toggle"
            onClick={() => setMobileMenu(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="welcome">
            <h2>{getGreeting()}, {firstName}! <Flower2 size={22} /></h2>
            <p>You're one step closer to your goals today. Keep going!</p>
          </div>
          <div className="topbar-actions">
            {activePage === 'Home' && (
              <label className="search-box">
                <Search size={18} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search your tasks..." />
                {search && <button onClick={() => setSearch('')}
                  aria-label="Clear search"><X size={16} /></button>}
              </label>
            )}
            <button className="icon-button notification-button"
              onClick={() => goTo('Tasks')}
              title={overdueCount ? `${overdueCount} overdue` : 'No overdue tasks'}
              aria-label={overdueCount
                ? `${overdueCount} overdue tasks, open tasks`
                : 'Notifications, nothing overdue'}>
              <Bell size={21} />
              {overdueCount > 0 && <span className="notification-dot" />}
            </button>
            <ProfileMenu
              user={user}
              onOpenSettings={() => goTo('Settings')}
              onLogout={onLogout}
            />
          </div>
        </header>

        {activePage === 'Home' ? (
          <>
            <div className="stats-grid">
              <StatCard icon={CheckSquare} title="Tasks Completed"
                value={`${completed} / ${tasks.length}`}
                percent={tasks.length ? Math.round(completed / tasks.length * 100) : 0} />
              <StatCard icon={Clock3} title="Focus Time"
                value={`${(focusMinutesToday / 60).toFixed(1)} h`}
                detail={focusMinutesToday
                  ? `${focusMinutesToday} min focused today`
                  : 'Finish a focus session to see it here.'} />
              <StatCard icon={Target} title="Goals Completed"
                value={`${goalsCompleted} / ${goals.length}`}
                percent={goals.length ? Math.round(goalsCompleted / goals.length * 100) : 0}
                detail={goals.length ? undefined : 'Add a goal to track it here.'} />
              <StatCard icon={Flame} title="Current Streak"
                value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
                detail={streak ? 'Keep showing up. ♥' : 'Complete a habit to start one.'} />
            </div>

            <div className="dashboard-grid">
              <section className="panel tasks-panel">
                <div className="panel-heading">
                  <h3><CheckSquare size={21} /> Today's Tasks</h3>
                  <button className="pink-button small-button"
                    onClick={() => setShowAddTask(!showAddTask)}>
                    <Plus size={16} /> Add Task
                  </button>
                </div>

                {showAddTask && (
                  <form className="add-task-form" onSubmit={addTask}>
                    <input autoFocus value={newTask}
                      onChange={e => setNewTask(e.target.value)}
                      placeholder="What do you need to do?" />
                    <button className="pink-button" type="submit">Add</button>
                    <button className="icon-button" type="button"
                      onClick={() => setShowAddTask(false)} aria-label="Cancel">
                      <X size={18} />
                    </button>
                  </form>
                )}

                <div className="task-list">
                  {filteredTasks.length === 0 && (
                    <p className="empty-state">
                      {search
                        ? 'No tasks match your search.'
                        : 'Nothing on your list for today. Add a task to get started! 🌸'}
                    </p>
                  )}
                  {filteredTasks.map(task => (
                    <div className={`task-row ${task.done ? 'task-done' : ''}`}
                      key={task.id}>
                      <button className={`task-check ${task.done ? 'checked' : ''}`}
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>
                        {task.done ? <CheckCircle2 size={20} /> : <Circle size={21} />}
                      </button>
                      <span className="task-title">{task.title}</span>
                      <span className={`priority priority-${(task.priority || 'Medium').toLowerCase()}`}>
                        {task.priority || 'Medium'}
                      </span>
                      <span className="task-time">
                        {task.dueDate === today
                          ? 'Today'
                          : task.dueDate
                            ? `Due ${task.dueDate}`
                            : 'No date'}
                      </span>
                      <button className="icon-button delete-button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="task-footer">
                  <span>{filteredTasks.filter(task => task.done).length} completed</span>
                  <span>{filteredTasks.filter(task => !task.done).length} remaining</span>
                </div>
              </section>

              <section className="panel schedule-panel">
                <div className="panel-heading">
                  <h3><CalendarDays size={21} /> Calendar</h3>
                  <button className="pink-text link-button" onClick={() => goTo('Calendar')}>
                    Open calendar
                  </button>
                </div>
                <div className="month-switcher">
                  <button className="icon-button" onClick={() => changeMonth(-1)}
                    aria-label="Previous month"><ChevronLeft size={18} /></button>
                  <strong>{monthLabel}</strong>
                  <button className="icon-button" onClick={() => changeMonth(1)}
                    aria-label="Next month"><ChevronRight size={18} /></button>
                </div>
                <div className="calendar-grid">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day =>
                    <span className="weekday" key={day}>{day}</span>
                  )}
                  {Array.from({ length: firstDay }, (_, i) =>
                    <span key={`blank-${i}`} />
                  )}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const hasItems = busyDays.has(`${monthPrefix}${String(day).padStart(2, '0')}`)
                    return (
                      <button key={day}
                        className={[
                          'calendar-day',
                          isCurrentMonth && now.getDate() === day ? 'today' : '',
                          hasItems ? 'has-items' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => openCalendarOn(day)}
                        aria-label={`Open ${monthLabel} ${day} in calendar`}>
                        {day}
                      </button>
                    )
                  })}
                </div>
                <div className="schedule-divider" />
                <h4 className="subheading">Your day at a glance</h4>
                {todayEvents.length === 0 && todayDueTasks.length === 0 && (
                  <p className="empty-state">Nothing scheduled for today.</p>
                )}
                {todayEvents.map(event => (
                  <div className="schedule-row" key={event.id}>
                    <span>{formatTime(event.startTime)}</span>
                    <div className={`schedule-event ${EVENT_COLORS[event.category] || 'pink'}`}>
                      {event.title}
                    </div>
                  </div>
                ))}
                {todayDueTasks.map(task => (
                  <div className="schedule-row" key={task.id}>
                    <span>Due</span>
                    <div className="schedule-event blue">{task.title}</div>
                  </div>
                ))}
              </section>

              <section className="panel notes-panel">
                <div className="panel-heading">
                  <h3><NotebookPen size={20} /> Quick Capture</h3>
                </div>
                <p className="muted">Write down a task or idea before you forget.</p>
                <form onSubmit={saveQuickNote}>
                  <textarea
                    value={quickNote}
                    onChange={e => setQuickNote(e.target.value)}
                    placeholder="Type your thoughts here..."
                    aria-label="Quick note"
                  />
                  <button
                    className="pink-button save-note-button"
                    type="submit"
                    disabled={!quickNote.trim()}
                  >
                    {noteSaved ? <><Check size={15} /> Saved to Notes</> : 'Save Note'}
                  </button>
                </form>
              </section>

              <section className="panel habits-panel">
                <div className="panel-heading">
                  <h3><Sprout size={20} /> Habits</h3>
                  <button
                    className="icon-button"
                    onClick={() => goTo('Habits')}
                    aria-label="Open habit tracker"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                {habits.length === 0 && (
                  <p className="empty-state">
                    No habits yet.{' '}
                    <button className="link-button pink-text" onClick={() => goTo('Habits')}>
                      Add your first habit
                    </button>
                  </p>
                )}
                {habits.slice(0, 4).map(habit => {
                  const done = (habit.completedDates || []).includes(today)
                  const doneDays = new Set(habit.completedDates || [])
                  return (
                    <div className="home-habit-row" key={habit.id}>
                      <button className={`task-check ${done ? 'checked' : ''}`}
                        onClick={() => toggleHabit(habit.id)}
                        aria-label={`${done ? 'Unmark' : 'Mark'} ${habit.name} for today`}>
                        {done ? <CheckCircle2 size={19} /> : <Circle size={20} />}
                      </button>
                      <div className="habit-info">
                        <span>{habit.icon} {habit.name}</span>
                        <small>{habitStreak(habit)} day streak</small>
                      </div>
                      <div className="habit-dots" aria-hidden="true">
                        {lastSevenDays.map(day =>
                          <span key={day} className={doneDays.has(day) ? 'filled' : ''} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            </div>
          </>
        ) : activePage === 'Tasks' ? (
          <TasksPage tasks={tasks} setTasks={setTasks} />
        ) : activePage === 'Calendar' ? (
          <CalendarPage
            key={calendarDate || 'today'}
            initialDate={calendarDate}
            tasks={tasks}
            setTasks={setTasks}
            events={events}
            setEvents={setEvents}
          />
        ) : activePage === 'Notes' ? (
          <NotesPage notes={notes} setNotes={setNotes} />
        ) : activePage === 'Habits' ? (
          <HabitsFocusPage
            view="habits"
            habits={habits}
            setHabits={setHabits}
            focusSessions={focusSessions}
            setFocusSessions={setFocusSessions}
            focusTimer={focusTimer}
          />
        ) : activePage === 'Time Tracker' ? (
          <HabitsFocusPage
            view="focus"
            habits={habits}
            setHabits={setHabits}
            focusSessions={focusSessions}
            setFocusSessions={setFocusSessions}
            focusTimer={focusTimer}
          />
        ) : activePage === 'Goals' ? (
          <GoalsPage goals={goals} setGoals={setGoals} />
        ) : (
          <SettingsPage
            user={user}
            onUpdateProfile={onUpdateProfile}
            data={{ tasks, events, notes, habits, focusSessions, goals }}
            setters={{
              tasks: setTasks,
              events: setEvents,
              notes: setNotes,
              habits: setHabits,
              focusSessions: setFocusSessions,
              goals: setGoals,
            }}
          />
        )}

        <footer className="app-footer">
          <Heart size={14} fill="currentColor" />
          <span>A better you is coming. Just keep showing up.</span>
        </footer>
      </main>
    </div>
  )
}