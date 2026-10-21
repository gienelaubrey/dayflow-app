import { useRef, useState } from 'react'
import {
  User, Download, Upload, Trash2, Check, Camera, Mail,
  CheckSquare, CalendarDays, NotebookPen, Sprout, Timer, Target,
} from 'lucide-react'
import Avatar from './Avatar.jsx'
import { fileToAvatar } from '../lib/image.js'

const DATA_LABELS = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
  { key: 'habits', label: 'Habits', icon: Sprout },
  { key: 'focusSessions', label: 'Focus sessions', icon: Timer },
  { key: 'goals', label: 'Goals', icon: Target },
]

export default function SettingsPage({ user, onUpdateProfile, data, setters }) {
  const [name, setName] = useState(user.name || '')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const [uploading, setUploading] = useState(false)
  const backupInput = useRef(null)
  const photoInput = useRef(null)

  const trimmedName = name.trim()
  const nameChanged = trimmedName !== user.name

  function showMessage(type, text) {
    setMessage({ type, text })
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!trimmedName || !nameChanged) return
    try {
      await onUpdateProfile({ name: trimmedName })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      showMessage('error', err.message)
    }
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      const avatar = await fileToAvatar(file)
      await onUpdateProfile({ avatar })
      showMessage('success', 'Profile photo updated.')
    } catch (err) {
      showMessage('error', err.message)
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto() {
    try {
      await onUpdateProfile({ avatar: null })
      showMessage('success', 'Profile photo removed.')
    } catch (err) {
      showMessage('error', err.message)
    }
  }

  function exportData() {
    const backup = {
      app: 'dayflow',
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dayflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    showMessage('success', 'Backup downloaded.')
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const backup = JSON.parse(await file.text())
      if (backup?.app !== 'dayflow' || typeof backup.data !== 'object' || !backup.data) {
        throw new Error('not a DayFlow backup')
      }

      const incoming = DATA_LABELS.filter(({ key }) => Array.isArray(backup.data[key]))
      if (incoming.length === 0) throw new Error('empty backup')

      const ok = window.confirm(
        'Restoring a backup replaces the matching data in DayFlow. Continue?'
      )
      if (!ok) return

      incoming.forEach(({ key }) => setters[key](backup.data[key]))
      showMessage('success', 'Backup restored.')
    } catch {
      showMessage('error', 'That file couldn’t be read. Choose a backup exported from DayFlow.')
    }
  }

  function resetData() {
    const ok = window.confirm(
      'Delete all tasks, events, notes, habits, focus sessions and goals? This cannot be undone.'
    )
    if (!ok) return
    DATA_LABELS.forEach(({ key }) => setters[key]([]))
    showMessage('success', 'All data cleared.')
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
            <p>Your photo and name appear in the top bar and your dashboard greeting.</p>
          </div>
        </div>

        <div className="settings-photo-row">
          <Avatar user={user} className="settings-avatar" />
          <div className="settings-photo-actions">
            <div className="settings-actions spread">
              <button
                type="button"
                className="cancel-button settings-button"
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
              >
                <Camera size={16} /> {uploading ? 'Uploading…' : user.avatar ? 'Change photo' : 'Upload photo'}
              </button>
              {user.avatar && (
                <button
                  type="button"
                  className="cancel-button settings-button"
                  onClick={removePhoto}
                >
                  Remove
                </button>
              )}
            </div>
            <small>JPG, PNG, WebP or GIF, up to 5 MB. It’s cropped to a square.</small>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            onChange={choosePhoto}
            hidden
            aria-label="Profile photo file"
          />
        </div>

        <form className="settings-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              placeholder="What should we call you?"
            />
          </label>

          <div className="settings-email">
            <Mail size={15} /> {user.email}
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
            onClick={() => backupInput.current?.click()}
          >
            <Upload size={16} /> Restore from backup
          </button>
          <input
            ref={backupInput}
            type="file"
            accept="application/json,.json"
            onChange={importData}
            hidden
            aria-label="Backup file"
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
