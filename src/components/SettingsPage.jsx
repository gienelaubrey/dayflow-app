import { useRef, useState } from 'react'
import {
  User, Download, Upload, Trash2, Check,
  CheckSquare, CalendarDays, NotebookPen, Sprout, Timer, Target,
} from 'lucide-react'

const DATA_LABELS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
  { key: 'habits', label: 'Habits', icon: Sprout },
  { key: 'focusSessions', label: 'Focus sessions', icon: Timer },
  { key: 'goals', label: 'Goals', icon: Target },
]

export default function SettingsPage({ settings, setSettings, data, setters }) {
  const [name, setName] = useState(settings.name || '')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const fileInput = useRef(null)

  const trimmedName = name.trim()
  const nameChanged = trimmedName !== (settings.name || '')

  function saveProfile(event) {
    event.preventDefault()
    if (!trimmedName) return
    setSettings(current => ({ ...current, name: trimmedName }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function exportData() {
    const backup = {
      app: 'dayflow',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      data,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `dayflow-backup-${stamp}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'Backup downloaded.' })
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const backup = JSON.parse(await file.text())

      if (backup?.app !== 'dayflow' || typeof backup.data !== 'object') {
        throw new Error('not a DayFlow backup')
      }

      const incoming = DATA_LABELS.filter(({ key }) => Array.isArray(backup.data[key]))
      if (incoming.length === 0) throw new Error('empty backup')

      const ok = window.confirm(
        'Restoring a backup replaces the matching data in DayFlow. Continue?'
      )
      if (!ok) return

      incoming.forEach(({ key }) => setters[key](backup.data[key]))
      if (backup.settings && typeof backup.settings === 'object') {
        setSettings(current => ({ ...current, ...backup.settings }))
        setName(backup.settings.name || '')
      }
      setMessage({ type: 'success', text: 'Backup restored.' })
    } catch {
      setMessage({
        type: 'error',
        text: "That file couldn't be read. Choose a backup exported from DayFlow.",
      })
    }
  }

  function resetData() {
    const ok = window.confirm(
      'Delete all tasks, events, notes, habits, focus sessions and goals? This cannot be undone.'
    )
    if (!ok) return
    DATA_LABELS.forEach(({ key }) => setters[key]([]))
    setMessage({ type: 'success', text: 'All data cleared.' })
  }

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">MAKE IT YOURS</p>
          <h1>Settings<span>.</span></h1>
          <p className="settings-subtitle">
            Your profile and your data, all stored on this device.
          </p>
        </div>
      </header>

      {message && (
        <div className={`settings-message ${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon"><User size={19} /></span>
          <div>
            <h2>Profile</h2>
            <p>Your name appears in the dashboard greeting.</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={saveProfile}>
          <div className="settings-profile-row">
            <div className="avatar settings-avatar" aria-hidden="true">
              {(trimmedName[0] || '?').toUpperCase()}
            </div>
            <label>
              Display name
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                placeholder="What should we call you?"
              />
            </label>
          </div>

          <div className="settings-actions">
            <button
              className="pink-button"
              type="submit"
              disabled={!trimmedName || !nameChanged}
            >
              <Check size={16} /> {saved ? 'Saved' : 'Save name'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-card-icon lavender"><Download size={19} /></span>
          <div>
            <h2>Your data</h2>
            <p>Everything lives in this browser. Download a backup to keep it safe or move it to another device.</p>
          </div>
        </div>

        <ul className="settings-counts">
          {DATA_LABELS.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <Icon size={16} />
              <span>{label}</span>
              <strong>{(data[key] || []).length}</strong>
            </li>
          ))}
        </ul>

        <div className="settings-actions spread">
          <button className="cancel-button settings-button" onClick={exportData}>
            <Download size={16} /> Download backup
          </button>
          <button
            className="cancel-button settings-button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} /> Restore from backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={importData}
            hidden
          />
        </div>
      </section>

      <section className="settings-card danger">
        <div className="settings-card-heading">
          <span className="settings-card-icon rose"><Trash2 size={19} /></span>
          <div>
            <h2>Clear all data</h2>
            <p>Removes every task, event, note, habit, focus session and goal. Download a backup first if you might want them back.</p>
          </div>
        </div>
        <div className="settings-actions">
          <button className="settings-danger-button" onClick={resetData}>
            <Trash2 size={16} /> Clear all data
          </button>
        </div>
      </section>
    </main>
  )
}
