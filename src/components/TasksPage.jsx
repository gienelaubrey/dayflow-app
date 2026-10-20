
import { useMemo, useState } from 'react'
import {
  Plus, Search, Circle, CheckCircle2, Pencil,
  Trash2, CalendarDays, X, ListTodo
} from 'lucide-react'

const emptyForm = {
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
}

const filters = ['All', 'Today', 'Upcoming', 'Completed', 'Overdue']

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TasksPage({ tasks, setTasks }) {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const today = localDateString()

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      const dueDate = task.dueDate || ''
      const matchesSearch = [
        task.title,
        task.description || '',
      ].join(' ').toLowerCase().includes(search.toLowerCase())

      const matchesPriority =
        priorityFilter === 'All' || task.priority === priorityFilter

      let matchesFilter = true

      if (filter === 'Today') {
        matchesFilter = dueDate === today && !task.done
      } else if (filter === 'Upcoming') {
        matchesFilter = dueDate > today && !task.done
      } else if (filter === 'Completed') {
        matchesFilter = task.done
      } else if (filter === 'Overdue') {
        matchesFilter = Boolean(dueDate && dueDate < today && !task.done)
      }

      return matchesSearch && matchesPriority && matchesFilter
    }).sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done)
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
  }, [tasks, search, filter, priorityFilter, today])

  const completed = tasks.filter(task => task.done).length
  const overdue = tasks.filter(task =>
    task.dueDate && task.dueDate < today && !task.done
  ).length

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEditForm(task) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate || '',
    })
    setShowForm(true)
  }

  function saveTask(event) {
    event.preventDefault()
    const title = form.title.trim()

    if (!title) return

    if (editingId !== null) {
      setTasks(current => current.map(task =>
        task.id === editingId
          ? { ...task, ...form, title }
          : task
      ))
    } else {
      setTasks(current => [
        ...current,
        {
          id: Date.now(),
          ...form,
          title,
          done: false,
          time: form.dueDate || 'No date set',
        },
      ])
    }

    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function toggleTask(id) {
    setTasks(current => current.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    ))
  }

  function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return
    setTasks(current => current.filter(task => task.id !== id))
  }

  return (
    <div className="task-manager">
      <div className="task-page-header">
        <div>
          <p className="task-eyebrow">YOUR PRODUCTIVITY SPACE</p>
          <h2>My Tasks <span>🌸</span></h2>
          <p className="muted">One step at a time. You've got this!</p>
        </div>
        <button className="pink-button" onClick={openCreateForm}>
          <Plus size={17} /> New Task
        </button>
      </div>

      <div className="task-stats">
        <div className="task-stat-card">
          <span>Total tasks</span><strong>{tasks.length}</strong>
        </div>
        <div className="task-stat-card">
          <span>Completed</span><strong>{completed}</strong>
        </div>
        <div className="task-stat-card">
          <span>Remaining</span><strong>{tasks.length - completed}</strong>
        </div>
        <div className="task-stat-card">
          <span>Overdue</span><strong>{overdue}</strong>
        </div>
      </div>

      <section className="panel task-manager-panel">
        <div className="task-toolbar">
          <label className="task-search">
            <Search size={17} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search tasks and descriptions..."
            />
          </label>

          <select value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
            aria-label="Filter by priority">
            <option value="All">All priorities</option>
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>
        </div>

        <div className="task-filter-tabs">
          {filters.map(item => (
            <button key={item}
              className={filter === item ? 'task-filter active' : 'task-filter'}
              onClick={() => setFilter(item)}>
              {item}
              {item === 'All' && <span>{tasks.length}</span>}
            </button>
          ))}
        </div>

        {showForm && (
          <form className="task-editor" onSubmit={saveTask}>
            <div className="editor-heading">
              <h3>{editingId !== null ? 'Edit task' : 'Create a new task'}</h3>
              <button className="icon-button" type="button"
                onClick={() => setShowForm(false)} aria-label="Close form">
                <X size={19} />
              </button>
            </div>

            <label>
              Task title *
              <input required maxLength={150} autoFocus
                value={form.title}
                onChange={event => setForm({
                  ...form, title: event.target.value
                })}
                placeholder="e.g. Finish my portfolio homepage" />
            </label>

            <label>
              Description
              <textarea maxLength={2000} rows={3}
                value={form.description}
                onChange={event => setForm({
                  ...form, description: event.target.value
                })}
                placeholder="Add details or reminders..." />
            </label>

            <div className="editor-fields">
              <label>
                Priority
                <select value={form.priority}
                  onChange={event => setForm({
                    ...form, priority: event.target.value
                  })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>

              <label>
                Due date
                <input type="date" value={form.dueDate}
                  onChange={event => setForm({
                    ...form, dueDate: event.target.value
                  })} />
              </label>
            </div>

            <div className="editor-actions">
              <button type="button" className="cancel-button"
                onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pink-button" type="submit">
                {editingId !== null ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        )}

        <div className="manager-task-list">
          {visibleTasks.map(task => (
            <article className={`manager-task ${task.done ? 'task-done' : ''}`}
              key={task.id}>
              <button className={`task-check ${task.done ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
                aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>
                {task.done ? <CheckCircle2 size={21} /> : <Circle size={21} />}
              </button>

              <div className="manager-task-info">
                <strong>{task.title}</strong>
                {task.description && <p>{task.description}</p>}
                <div className="manager-task-meta">
                  <span className={`priority priority-${(task.priority || 'Medium').toLowerCase()}`}>
                    {task.priority || 'Medium'}
                  </span>
                  <span className="due-date">
                    <CalendarDays size={13} />
                    {task.dueDate || 'No due date'}
                  </span>
                </div>
              </div>

              <div className="manager-task-actions">
                <button className="icon-button" onClick={() => openEditForm(task)}
                  aria-label={`Edit ${task.title}`}><Pencil size={16} /></button>
                <button className="icon-button" onClick={() => deleteTask(task.id)}
                  aria-label={`Delete ${task.title}`}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}

          {visibleTasks.length === 0 && (
            <div className="task-empty">
              <ListTodo size={35} />
              <h3>No tasks found</h3>
              <p>Try another filter or create a new task. 💗</p>
              <button className="pink-button" onClick={openCreateForm}>
                <Plus size={16} /> Create a task
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
