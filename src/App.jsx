import TasksPage from './components/TasksPage.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import NotesPage from './components/NotesPage.jsx'
import { useEffect, useState } from 'react'
import {
  House, CalendarDays, CheckSquare, NotebookPen,
  Sprout, Timer, Target, Settings, Search, Bell,
  Plus, Circle, CheckCircle2, Clock3, Flame,
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw,
  Heart, Menu, X, Trash2, Flower2
} from 'lucide-react'

const initialTasks = [
  { id: 1, title: 'Update CV', time: '9:00 AM', priority: 'High', done: true },
  { id: 2, title: 'Build portfolio project', time: '10:00 AM', priority: 'High', done: false },
  { id: 3, title: 'Review interview questions', time: '2:00 PM', priority: 'Medium', done: false },
  { id: 4, title: 'Go for a short walk', time: '4:00 PM', priority: 'Low', done: false },
  { id: 5, title: 'Study web development', time: '7:00 PM', priority: 'Medium', done: true },
  { id: 6, title: 'Read a book', time: '8:30 PM', priority: 'Low', done: false },
]

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

function App() {
    const [events, setEvents] = useState(() => {
  try {
    const saved = localStorage.getItem('dayflow-events')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
  })
    const [tasks, setTasks] = useState(() => {
  try {
      const saved = localStorage.getItem('dayflow-tasks')
      return saved ? JSON.parse(saved) : initialTasks
  } catch {
    return initialTasks
  }
  })
    const [notes, setNotes] = useState(() => {
  try {
      const saved = localStorage.getItem('dayflow-notes')
      return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
  })
  const [activePage, setActivePage] = useState('Home')
  const [newTask, setNewTask] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [search, setSearch] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [seconds, setSeconds] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerMode, setTimerMode] = useState('Focus')
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 9, 1))

  useEffect(() => {
    localStorage.setItem('dayflow-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
  localStorage.setItem('dayflow-notes', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    if (!timerRunning) return
    const id = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [timerRunning])

  const completed = tasks.filter(task => task.done).length
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  )

  function addTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    setTasks(current => [
      ...current,
      {
        id: Date.now(),
        title: newTask.trim(),
        time: 'No time set',
        priority: 'Medium',
        done: false,
      },
    ])
    setNewTask('')
    setShowAddTask(false)
  }

  function toggleTask(id) {
    setTasks(current =>
      current.map(task =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    )
  }

  function deleteTask(id) {
    setTasks(current => current.filter(task => task.id !== id))
  }

  function changeTimer(mode) {
    const durations = { Focus: 25, 'Short Break': 5, 'Long Break': 15 }
    setTimerMode(mode)
    setTimerRunning(false)
    setSeconds(durations[mode] * 60)
  }

  function changeMonth(offset) {
    setCurrentMonth(current =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    )
  }

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === currentMonth.getFullYear() &&
    today.getMonth() === currentMonth.getMonth()

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
              onClick={() => {
                setActivePage(label)
                setMobileMenu(false)
              }}>
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
            <h2>Good morning, Elle! <Flower2 size={22} /></h2>
            <p>You're one step closer to your goals today. Keep going!</p>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search your tasks..." />
              {search && <button onClick={() => setSearch('')}
                aria-label="Clear search"><X size={16} /></button>}
            </label>
            <button className="icon-button notification-button"
              aria-label="Notifications">
              <Bell size={21} /><span className="notification-dot" />
            </button>
            <div className="avatar">E</div>
          </div>
        </header>

        {activePage === 'Home' ? (
          <>
            <div className="stats-grid">
              <StatCard icon={CheckSquare} title="Tasks Completed"
                value={`${completed} / ${tasks.length}`}
                percent={tasks.length ? Math.round(completed / tasks.length * 100) : 0} />
              <StatCard icon={Clock3} title="Focus Time" value="0.0 h"
                detail="Your focus sessions will appear here." />
              <StatCard icon={CalendarDays} title="This Week's Goals"
                value="2 / 5" percent={40} />
              <StatCard icon={Flame} title="Current Streak" value="4 days"
                detail="Keep showing up. ♥" />
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
                    <p className="empty-state">No tasks found. Add a task to get started! 🌸</p>
                  )}
                  {filteredTasks.map(task => (
                    <div className={`task-row ${task.done ? 'task-done' : ''}`}
                      key={task.id}>
                      <button className={`task-check ${task.done ? 'checked' : ''}`}
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>
                        {task.done && <CheckCircle2 size={20} />}
                        {!task.done && <Circle size={21} />}
                      </button>
                      <span className="task-title">{task.title}</span>
                      <span className={`priority priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <span className="task-time">{task.time}</span>
                      <button className="icon-button delete-button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="task-footer">
                  <span>{completed} completed</span>
                  <span>{tasks.length - completed} remaining</span>
                </div>
              </section>

              <section className="panel schedule-panel">
                <div className="panel-heading">
                  <h3><CalendarDays size={21} /> Calendar</h3>
                  <span className="pink-text">Your month</span>
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
                    return (
                      <button key={day}
                        className={`calendar-day ${isCurrentMonth && today.getDate() === day ? 'today' : ''}`}
                        onClick={() => setActivePage('Tasks')}>
                        {day}
                      </button>
                    )
                  })}
                </div>
                <div className="schedule-divider" />
                <h4 className="subheading">Your day at a glance</h4>
                {[
                  ['9:00 AM', 'Update CV', 'pink'],
                  ['10:00 AM', 'Build portfolio project', 'purple'],
                  ['2:00 PM', 'Review interview questions', 'blue'],
                  ['4:00 PM', 'Walk / Fresh Air', 'green'],
                ].map(([time, title, color]) => (
                  <div className="schedule-row" key={time}>
                    <span>{time}</span>
                    <div className={`schedule-event ${color}`}>{title}</div>
                  </div>
                ))}
              </section>

              <section className="panel notes-panel">
                <div className="panel-heading">
                  <h3><NotebookPen size={20} /> Quick Capture</h3>
                </div>
                <p className="muted">Write down a task or idea before you forget.</p>
                <textarea id="quick-note" placeholder="Type your thoughts here..." />
                <button className="pink-button save-note-button"
                  onClick={() => {
                    const text = document.getElementById('quick-note').value.trim()
                    if (!text) return
                    const notes = JSON.parse(localStorage.getItem('dayflow-notes') || '[]')
                    notes.unshift({ id: Date.now(), text, date: new Date().toLocaleDateString() })
                    localStorage.setItem('dayflow-notes', JSON.stringify(notes))
                    document.getElementById('quick-note').value = ''
                    alert('Note saved! You can view it in Notes.')
                  }}>Save Note</button>
              </section>

              <section className="panel habits-panel">
                <div className="panel-heading">
                  <h3><Sprout size={20} /> Habits</h3>
                </div>
                {['Drink water', 'Exercise / Walk', 'Read a book', 'Learn to code'].map((habit, i) => (
                  <HabitRow key={habit} habit={habit} initialCount={i === 0 ? 5 : i === 1 ? 3 : 2} />
                ))}
              </section>

              <section className="panel timer-panel">
                <div className="panel-heading">
                  <h3><Timer size={20} /> Focus Timer</h3>
                </div>
                <div className="timer-circle" style={{
                  '--timer-progress': `${seconds / ((timerMode === 'Focus' ? 25 : timerMode === 'Short Break' ? 5 : 15) * 60) * 100}%`
                }}>
                  <strong>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong>
                  <span>{timerMode}</span>
                </div>
                <div className="timer-modes">
                  {['Focus', 'Short Break', 'Long Break'].map(mode => (
                    <button key={mode}
                      className={timerMode === mode ? 'selected' : ''}
                      onClick={() => changeTimer(mode)}>{mode}</button>
                  ))}
                </div>
                <div className="timer-actions">
                  <button className="pink-button timer-play"
                    onClick={() => {
                      if (seconds === 0) changeTimer(timerMode)
                      else setTimerRunning(!timerRunning)
                    }}>
                    {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                    {timerRunning ? 'Pause' : 'Start focus'}
                  </button>
                  <button className="icon-button" onClick={() => changeTimer(timerMode)}
                    aria-label="Reset timer"><RotateCcw size={18} /></button>
                </div>
              </section>
            </div>
          </>
        ) : activePage === 'Tasks' ? (
          <TasksPage tasks={tasks} setTasks={setTasks} />
        ) : activePage === 'Calendar' ? (
          <CalendarPage
            tasks={tasks}
            setTasks={setTasks}
            events={events}
            setEvents={setEvents}
          />
        ) : activePage === 'Notes' ? (
          <NotesPage
            notes={notes}
            setNotes={setNotes}
          />
        ) : (
          <section className="panel page-placeholder">
            <div className="placeholder-icon"><Flower2 size={34} /></div>
            <h2>{activePage}</h2>
            <p>This page is planned for the next development phase.</p>
            <p className="muted">
              Your {activePage.toLowerCase()} workspace will live here. 🌸
            </p>
            <button className="pink-button" onClick={() => setActivePage('Home')}>
              Back to dashboard
            </button>
          </section>
        )}

        <footer className="app-footer">
          <Heart size={14} fill="currentColor" />
          <span>A better you is coming. Just keep showing up.</span>
        </footer>
      </main>
    </div>
  )
}

function HabitRow({ habit, initialCount }) {
  const [done, setDone] = useState(false)
  return (
    <div className="habit-row">
      <button className={`task-check ${done ? 'checked' : ''}`}
        onClick={() => setDone(!done)} aria-label={`Toggle ${habit}`}>
        {done ? <CheckCircle2 size={19} /> : <Circle size={20} />}
      </button>
      <div className="habit-info">
        <span>{habit}</span>
        <small>{initialCount + (done ? 1 : 0)} / 7 days</small>
      </div>
      <div className="habit-dots">
        {Array.from({ length: 7 }, (_, i) =>
          <span key={i} className={i < initialCount + (done ? 1 : 0) ? 'filled' : ''} />
        )}
      </div>
    </div>
  )
}

export default App
