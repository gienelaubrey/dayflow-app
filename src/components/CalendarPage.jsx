import { useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays,
  Clock, MapPin, Pencil, Trash2, X, CheckCircle2,
  Circle, ListTodo, CalendarCheck
} from 'lucide-react'
import useTodayKey from '../lib/useTodayKey.js'

const CATEGORIES = [
  'Personal',
  'Work',
  'Study',
  'Interview',
  'Health',
  'Other',
]

const COLORS = {
  Personal: 'pink',
  Work: 'purple',
  Study: 'blue',
  Interview: 'orange',
  Health: 'green',
  Other: 'pink',
}

const blankEvent = {
  title: '',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  category: 'Personal',
  location: '',
  description: '',
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sameDayLabel(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatMonth(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time) {
  if (!time) return ''
  const [hour, minute] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CalendarPage({
  tasks = [],
  onToggleTask,
  events = [],
  loading = false,
  error = '',
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  initialDate = null,
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate || dateKey(new Date()))
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const start = initialDate ? parseDate(initialDate) : new Date()
    return new Date(start.getFullYear(), start.getMonth(), 1)
  })
  const [view, setView] = useState('Month')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(blankEvent)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const today = useTodayKey()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    )
    const start = shiftDate(firstDay, -firstDay.getDay())

    return Array.from({ length: 42 }, (_, index) =>
      shiftDate(start, index)
    )
  }, [visibleMonth])

  const weekDays = useMemo(() => {
    const date = parseDate(selectedDate)
    const start = shiftDate(date, -date.getDay())
    return Array.from({ length: 7 }, (_, index) =>
      shiftDate(start, index)
    )
  }, [selectedDate])

  const selectedEvents = useMemo(() => {
    return events
      .filter(event => event.date === selectedDate)
      .sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      )
  }, [events, selectedDate])

  const selectedTasks = useMemo(() => {
    return tasks.filter(task =>
      task.dueDate === selectedDate
    )
  }, [tasks, selectedDate])

  const eventsByDate = useMemo(() => {
    const grouped = {}
    events.forEach(event => {
      if (!grouped[event.date]) grouped[event.date] = []
      grouped[event.date].push(event)
    })
    return grouped
  }, [events])

  const tasksByDate = useMemo(() => {
    const grouped = {}
    tasks.forEach(task => {
      if (task.dueDate) {
        if (!grouped[task.dueDate]) grouped[task.dueDate] = []
        grouped[task.dueDate].push(task)
      }
    })
    return grouped
  }, [tasks])

  function changeMonth(amount) {
    setVisibleMonth(current =>
      new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1,
      )
    )
  }

  function selectDate(date) {
    setSelectedDate(dateKey(date))
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  function openCreateForm() {
    setEditingId(null)
    setForm({ ...blankEvent, date: selectedDate })
    setShowForm(true)
  }

  function openEditForm(event) {
    setEditingId(event.id)
    setForm({
      ...blankEvent,
      ...event,
    })
    setShowForm(true)
  }

  async function saveEvent(event) {
    event.preventDefault()
    if (saving) return

    const title = form.title.trim()
    if (!title || !form.date) return

    if (form.endTime <= form.startTime) {
      window.alert('The end time must be later than the start time.')
      return
    }

    setSaving(true)
    setActionError('')

    try {
      const payload = { ...form, title }

      if (editingId !== null) {
        if (!onUpdateEvent) throw new Error('Calendar updates are unavailable.')
        await onUpdateEvent(editingId, payload)
      } else {
        if (!onCreateEvent) throw new Error('Calendar creation is unavailable.')
        await onCreateEvent(payload)
      }

      setSelectedDate(form.date)
      const date = parseDate(form.date)
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      setShowForm(false)
      setEditingId(null)
      setForm(blankEvent)
    } catch (err) {
      setActionError(err?.message || 'Could not save the calendar event.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id) {
    if (!window.confirm('Delete this calendar event?')) return
    if (!onDeleteEvent) return

    setDeletingId(id)
    setActionError('')

    try {
      await onDeleteEvent(id)
    } catch (err) {
      setActionError(err?.message || 'Could not delete the calendar event.')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleTask(id) {
    if (!onToggleTask) return
    onToggleTask(id).catch(() => {})
  }

  const headingDate = parseDate(selectedDate)

  return (
    <main className="calendar-page">
      <header className="calendar-page-header">
        <div>
          <p className="calendar-eyebrow">MAKE TIME FOR WHAT MATTERS</p>
          <h1>My Calendar<span>.</span></h1>
          <p className="calendar-subtitle">
            Your plans, your pace, your progress.
          </p>
        </div>

        <button className="pink-button" onClick={openCreateForm}>
          <Plus size={17} /> New event
        </button>
      </header>

      {loading && (
        <div className="settings-message" role="status">Loading calendar events…</div>
      )}

      {(error || actionError) && (
        <div className="settings-message error" role="alert">
          {actionError || error}
        </div>
      )}

      <div className="calendar-summary">
        <article className="calendar-summary-card">
          <CalendarDays size={20} />
          <div>
            <span>Scheduled events</span>
            <strong>{events.length}</strong>
          </div>
        </article>
        <article className="calendar-summary-card">
          <ListTodo size={20} />
          <div>
            <span>Tasks with deadlines</span>
            <strong>{tasks.filter(task => task.dueDate).length}</strong>
          </div>
        </article>
        <article className="calendar-summary-card">
          <CalendarCheck size={20} />
          <div>
            <span>Events today</span>
            <strong>{events.filter(event => event.date === today).length}</strong>
          </div>
        </article>
      </div>

      <div className="calendar-layout">
        <section className="panel calendar-main-panel">
          <div className="calendar-toolbar">
            <div className="calendar-month-title">
              <h3>{formatMonth(visibleMonth)}</h3>
              <button className="calendar-today-button"
                onClick={() => {
                  selectDate(new Date())
                  setView('Month')
                }}>
                Today
              </button>
            </div>

            <div className="calendar-controls">
              <div className="calendar-view-switch">
                {['Month', 'Week', 'Day'].map(item => (
                  <button key={item}
                    className={view === item ? 'selected' : ''}
                    onClick={() => setView(item)}>
                    {item}
                  </button>
                ))}
              </div>

              <button className="icon-button"
                onClick={() => view === 'Month'
                  ? changeMonth(-1)
                  : selectDate(shiftDate(headingDate, view === 'Week' ? -7 : -1))}
                aria-label="Previous period">
                <ChevronLeft size={18} />
              </button>

              <button className="icon-button"
                onClick={() => view === 'Month'
                  ? changeMonth(1)
                  : selectDate(shiftDate(headingDate, view === 'Week' ? 7 : 1))}
                aria-label="Next period">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {view === 'Month' && (
            <div className="calendar-grid-full">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div className="calendar-weekday" key={day}>{day}</div>
              ))}

              {calendarDays.map((date, index) => {
                const key = dateKey(date)
                const inMonth =
                  date.getMonth() === visibleMonth.getMonth()
                const dayEvents = eventsByDate[key] || []
                const dayTasks = tasksByDate[key] || []
                const selected = key === selectedDate
                const isToday = key === today

                return (
                  <button key={key + '-' + index}
                    className={[
                      'calendar-cell',
                      !inMonth ? 'outside-month' : '',
                      selected ? 'selected-day' : '',
                      isToday ? 'is-today' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => selectDate(date)}
                    aria-label={`${sameDayLabel(date)}, ${dayEvents.length} events, ${dayTasks.length} tasks`}>
                    <span className="calendar-cell-number">{date.getDate()}</span>

                    <div className="calendar-cell-markers">
                      {dayEvents.slice(0, 2).map(event => (
                        <span key={event.id}
                          className={`calendar-event-marker ${COLORS[event.category] || 'pink'}`}>
                          {event.title}
                        </span>
                      ))}

                      {dayTasks.slice(0, 2).map(task => (
                        <span key={task.id}
                          className={`calendar-task-marker ${task.done ? 'is-complete' : ''}`}>
                          <span>•</span> {task.title}
                        </span>
                      ))}

                      {dayEvents.length + dayTasks.length > 4 && (
                        <small>+ more</small>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {view === 'Week' && (
            <div className="calendar-week-view">
              {weekDays.map(date => {
                const key = dateKey(date)
                return (
                  <button key={key}
                    className={`calendar-week-day ${key === selectedDate ? 'active' : ''}`}
                    onClick={() => selectDate(date)}>
                    <span>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <strong>{date.getDate()}</strong>
                    <small>
                      {(eventsByDate[key] || []).length + (tasksByDate[key] || []).length} items
                    </small>
                  </button>
                )
              })}
              <p className="calendar-week-hint">
                Select a day to see its schedule in the agenda panel.
              </p>
            </div>
          )}

          {view === 'Day' && (
            <div className="calendar-day-view">
              <div className="day-view-date">
                <span>{headingDate.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <strong>{headingDate.getDate()}</strong>
                <span>{headingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <p>
                {(eventsByDate[selectedDate] || []).length} events and{' '}
                {(tasksByDate[selectedDate] || []).length} tasks scheduled.
              </p>
              <button className="pink-button" onClick={openCreateForm}>
                <Plus size={15} /> Schedule this day
              </button>
            </div>
          )}
        </section>

        <aside className="panel calendar-agenda">
          <div className="agenda-header">
            <div>
              <p className="calendar-eyebrow">YOUR AGENDA</p>
              <h3>{sameDayLabel(headingDate)}</h3>
            </div>
            <button className="icon-button" onClick={openCreateForm}
              aria-label="Add event">
              <Plus size={19} />
            </button>
          </div>

          <div className="agenda-section">
            <h4><CalendarDays size={15} /> Events ({selectedEvents.length})</h4>

            {selectedEvents.length === 0 && (
              <p className="agenda-empty">Nothing scheduled yet. Make some time for yourself!</p>
            )}

            {selectedEvents.map(event => (
              <article key={event.id}
                className={`agenda-event ${COLORS[event.category] || 'pink'}`}>
                <div className="agenda-event-top">
                  <span className="agenda-event-time">
                    <Clock size={13} />
                    {formatTime(event.startTime)} – {formatTime(event.endTime)}
                  </span>
                  <div className="agenda-actions">
                    <button onClick={() => openEditForm(event)}
                      aria-label={`Edit ${event.title}`}><Pencil size={14} /></button>
                    <button onClick={() => deleteEvent(event.id)}
                      disabled={deletingId === event.id}
                      aria-label={`Delete ${event.title}`}><Trash2 size={14} /></button>
                  </div>
                </div>
                <strong>{event.title}</strong>
                <span className="agenda-category">{event.category}</span>
                {event.location && <p><MapPin size={12} /> {event.location}</p>}
                {event.description && <p>{event.description}</p>}
              </article>
            ))}
          </div>

          <div className="agenda-divider" />

          <div className="agenda-section">
            <h4><ListTodo size={15} /> Due tasks ({selectedTasks.length})</h4>

            {selectedTasks.length === 0 && (
              <p className="agenda-empty">No tasks due on this date.</p>
            )}

            {selectedTasks.map(task => (
              <div key={task.id} className="agenda-task">
                <button className={`task-check ${task.done ? 'checked' : ''}`}
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>
                  {task.done
                    ? <CheckCircle2 size={18} />
                    : <Circle size={18} />}
                </button>
                <div>
                  <strong className={task.done ? 'agenda-task-done' : ''}>
                    {task.title}
                  </strong>
                  <span>{task.priority || 'Medium'} priority</span>
                </div>
              </div>
            ))}
          </div>

          <button className="agenda-add-button" onClick={openCreateForm}>
            <Plus size={15} /> Add an event
          </button>
        </aside>
      </div>

      {showForm && (
        <div className="calendar-modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowForm(false)
          }}>
          <form className="calendar-event-form"
            onSubmit={saveEvent}>
            <div className="calendar-form-heading">
              <div>
                <p className="calendar-eyebrow">PLAN SOMETHING LOVELY</p>
                <h3>{editingId !== null ? 'Edit event' : 'New calendar event'}</h3>
              </div>
              <button type="button" className="icon-button"
                disabled={saving}
                onClick={() => setShowForm(false)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <label>
              Event title *
              <input required maxLength={150} autoFocus
                placeholder="e.g. Job interview, study session..."
                value={form.title}
                onChange={event => setForm({ ...form, title: event.target.value })} />
            </label>

            <label>
              Date *
              <input required type="date" value={form.date}
                onChange={event => setForm({ ...form, date: event.target.value })} />
            </label>

            <div className="calendar-time-fields">
              <label>
                Start time
                <input required type="time" value={form.startTime}
                  onChange={event => setForm({ ...form, startTime: event.target.value })} />
              </label>
              <label>
                End time
                <input required type="time" value={form.endTime}
                  onChange={event => setForm({ ...form, endTime: event.target.value })} />
              </label>
            </div>

            <label>
              Category
              <select value={form.category}
                onChange={event => setForm({ ...form, category: event.target.value })}>
                {CATEGORIES.map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Location (optional)
              <input maxLength={200} placeholder="e.g. Online, office, gym..."
                value={form.location}
                onChange={event => setForm({ ...form, location: event.target.value })} />
            </label>

            <label>
              Notes (optional)
              <textarea maxLength={2000} rows={3}
                placeholder="Add details or things to prepare..."
                value={form.description}
                onChange={event => setForm({ ...form, description: event.target.value })} />
            </label>

            <div className="calendar-form-actions">
              <button type="button" className="cancel-button"
                disabled={saving}
                onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pink-button" type="submit" disabled={saving}>
                {saving
                  ? (editingId !== null ? 'Saving…' : 'Creating…')
                  : (editingId !== null ? 'Save changes' : 'Create event')}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}