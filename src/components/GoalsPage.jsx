import { useState } from 'react'
import {
  Plus,
  Target,
  CalendarDays,
  Pencil,
  Trash2,
  Check,
  X,
  Trophy,
  CircleCheck,
} from 'lucide-react'
import useTodayKey from '../lib/useTodayKey.js'

const emptyGoal = {
  title: '',
  description: '',
  category: 'Personal',
  targetDate: '',
  progress: 0,
}

export default function GoalsPage({ goals = [], setGoals }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyGoal)
  const [filter, setFilter] = useState('All')
  const today = useTodayKey()

  const categories = ['Personal', 'Career', 'Health', 'Learning', 'Finance']
  const completedGoals = goals.filter(goal => goal.progress >= 100).length
  const activeGoals = goals.length - completedGoals

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyGoal)
    setShowForm(true)
  }

  function openEditForm(goal) {
    setEditingId(goal.id)
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      category: goal.category || 'Personal',
      targetDate: goal.targetDate || '',
      progress: goal.progress || 0,
    })
    setShowForm(true)
  }

  function saveGoal(event) {
    event.preventDefault()
    if (!form.title.trim()) return

    const cleanGoal = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      progress: Number(form.progress),
    }

    if (editingId !== null) {
      setGoals(current =>
        current.map(goal =>
          goal.id === editingId ? { ...goal, ...cleanGoal } : goal
        )
      )
    } else {
      setGoals(current => [
        ...current,
        {
          ...cleanGoal,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
      ])
    }

    setShowForm(false)
    setEditingId(null)
    setForm(emptyGoal)
  }

  function deleteGoal(id) {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return
    setGoals(current => current.filter(goal => goal.id !== id))
  }

  function updateProgress(id, progress) {
    setGoals(current =>
      current.map(goal =>
        goal.id === id ? { ...goal, progress: Number(progress) } : goal
      )
    )
  }

  const visibleGoals = goals.filter(goal =>
    filter === 'All' ? true :
    filter === 'Completed' ? goal.progress >= 100 :
    filter === 'In progress' ? goal.progress < 100 :
    goal.category === filter
  )

  return (
    <main className="goals-page">
      <header className="goals-header">
        <div>
          <p className="goals-eyebrow">DREAM IT. PLAN IT. DO IT.</p>
          <h1>My Goals<span>.</span></h1>
          <p className="goals-subtitle">
            Little steps today, meaningful progress tomorrow.
          </p>
        </div>

        <button className="pink-button" onClick={openCreateForm}>
          <Plus size={17} /> Add goal
        </button>
      </header>

      <section className="goals-stats">
        <article className="goals-stat">
          <span className="goals-stat-icon"><Target size={21} /></span>
          <div><p>Total goals</p><strong>{goals.length}</strong></div>
        </article>
        <article className="goals-stat">
          <span className="goals-stat-icon lavender"><CalendarDays size={21} /></span>
          <div><p>In progress</p><strong>{activeGoals}</strong></div>
        </article>
        <article className="goals-stat">
          <span className="goals-stat-icon peach"><Trophy size={21} /></span>
          <div><p>Completed</p><strong>{completedGoals}</strong></div>
        </article>
      </section>

      {showForm && (
        <form className="goals-form" onSubmit={saveGoal}>
          <div className="goals-form-heading">
            <h2>{editingId !== null ? 'Edit goal' : 'Create a goal'}</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              <X size={19} />
            </button>
          </div>

          <label>
            Goal title *
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Get my first developer job"
              maxLength={100}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Why is this goal important to you?"
              rows={3}
              maxLength={500}
            />
          </label>

          <div className="goals-form-grid">
            <label>
              Category
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {categories.map(category =>
                  <option key={category} value={category}>{category}</option>
                )}
              </select>
            </label>

            <label>
              Target date
              <input
                type="date"
                min={editingId === null ? today : undefined}
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
              />
            </label>
          </div>

          <label>
            Current progress: {form.progress}%
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.progress}
              onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
            />
          </label>

          <div className="goals-form-actions">
            <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="pink-button">
              <Check size={16} /> Save goal
            </button>
          </div>
        </form>
      )}

      <div className="goals-list-heading">
        <div>
          <h2>Your journey</h2>
          <p>Progress at your own pace.</p>
        </div>
        <select
          className="goals-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter goals"
        >
          {['All', 'In progress', 'Completed', ...categories].map(option =>
            <option key={option} value={option}>{option}</option>
          )}
        </select>
      </div>

      {visibleGoals.length > 0 ? (
        <section className="goals-grid">
          {visibleGoals.map(goal => {
            const isComplete = goal.progress >= 100
            const overdue = goal.targetDate &&
              goal.targetDate < today && !isComplete

            return (
              <article className="goal-card" key={goal.id}>
                <div className="goal-card-top">
                  <span className="goal-category">{goal.category}</span>
                  <div className="goal-actions">
                    <button
                      className="icon-button"
                      onClick={() => openEditForm(goal)}
                      aria-label={`Edit ${goal.title}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => deleteGoal(goal.id)}
                      aria-label={`Delete ${goal.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="goal-card-icon">
                  {isComplete ? <CircleCheck size={24} /> : <Target size={24} />}
                </div>

                <h3>{goal.title}</h3>
                {goal.description && <p className="goal-description">{goal.description}</p>}

                <div className="goal-progress-label">
                  <span>Progress</span>
                  <strong>{goal.progress}%</strong>
                </div>

                <div
                  className="goal-progress-track"
                  role="progressbar"
                  aria-valuenow={goal.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.title} progress`}
                >
                  <div style={{ width: `${goal.progress}%` }} />
                </div>

                <label className="goal-progress-control">
                  Update progress
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={goal.progress}
                    onChange={e => updateProgress(goal.id, e.target.value)}
                    aria-label={`Update progress for ${goal.title}`}
                  />
                </label>

                <div className={`goal-date ${overdue ? 'overdue' : ''}`}>
                  <CalendarDays size={15} />
                  {isComplete
                    ? 'Goal completed!'
                    : goal.targetDate
                      ? overdue
                        ? `Past target · ${goal.targetDate}`
                        : `Target · ${goal.targetDate}`
                      : 'No target date'}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="goals-empty">
          <span>🌷</span>
          <h3>{goals.length ? 'No goals in this filter' : 'Every big achievement starts small'}</h3>
          <p>
            {goals.length
              ? 'Try another filter to see your goals.'
              : 'Create your first goal and track your progress here.'}
          </p>
          {goals.length === 0 && (
            <button className="pink-button" onClick={openCreateForm}>
              <Plus size={17} /> Create your first goal
            </button>
          )}
        </section>
      )}
    </main>
  )
}