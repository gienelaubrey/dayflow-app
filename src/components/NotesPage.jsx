import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Star,
  Trash2,
  X,
  FileText,
  Lightbulb,
  BookOpen,
  Code2,
  BriefcaseBusiness,
  StickyNote,
  ArrowUpRight,
} from 'lucide-react'

const CATEGORIES = [
  'Personal',
  'Study',
  'Coding',
  'Work',
  'Ideas',
]

const CATEGORY_ICONS = {
  Personal: Lightbulb,
  Study: BookOpen,
  Coding: Code2,
  Work: BriefcaseBusiness,
  Ideas: StickyNote,
}

const EMPTY_NOTE = {
  title: '',
  content: '',
  category: 'Personal',
  favorite: false,
  pinned: false,
}

function formatDate(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function NotesPage({
  notes = [],
  setNotes,
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All Notes')
  const [quickCapture, setQuickCapture] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [noteForm, setNoteForm] = useState(EMPTY_NOTE)

  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim()

    return (notes || [])
      .filter((note) => {
        if (!note) return false

        // Guard against undefined/null title or content
        const title = (note.title || '').toLowerCase()
        const content = (note.content || '').toLowerCase()

        const matchesSearch =
          title.includes(query) ||
          content.includes(query)

        const matchesFilter =
          filter === 'All Notes' ||
          (filter === 'Favorites' && Boolean(note.favorite)) ||
          (filter === 'Pinned' && Boolean(note.pinned)) ||
          note.category === filter

        return matchesSearch && matchesFilter
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
        }

        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
        return dateB - dateA
      })
  }, [notes, search, filter])

  function openNewNote() {
    setEditingNote(null)
    setNoteForm({ ...EMPTY_NOTE })
    setShowEditor(true)
  }

  function openEditNote(note) {
    setEditingNote(note)
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
      favorite: note.favorite,
      pinned: note.pinned,
    })
    setShowEditor(true)
  }

  function closeEditor() {
    setShowEditor(false)
    setEditingNote(null)
  }

  function saveNote(event) {
    event.preventDefault()

    if (!noteForm.title.trim() && !noteForm.content.trim()) {
      return
    }

    const now = new Date().toISOString()

    if (editingNote) {
      setNotes((previous) =>
        previous.map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                ...noteForm,
                title: noteForm.title.trim() || 'Untitled note',
                updatedAt: now,
              }
            : note
        )
      )
    } else {
      setNotes((previous) => [
        {
          id: crypto.randomUUID(),
          ...noteForm,
          title: noteForm.title.trim() || 'Untitled note',
          createdAt: now,
          updatedAt: now,
        },
        ...previous,
      ])
    }

    closeEditor()
  }

  function captureIdea(event) {
    event.preventDefault()

    const content = quickCapture.trim()
    if (!content) return

    const now = new Date().toISOString()

    setNotes((previous) => [
      {
        id: crypto.randomUUID(),
        title: content.length > 48
          ? `${content.slice(0, 48)}…`
          : content,
        content,
        category: 'Ideas',
        favorite: false,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      },
      ...previous,
    ])

    setQuickCapture('')
  }

  function toggleNoteProperty(id, property) {
    setNotes((previous) =>
      previous.map((note) =>
        note.id === id
          ? {
              ...note,
              [property]: !note[property],
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    )
  }

  function deleteNote(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this note?'
    )

    if (!confirmed) return

    setNotes((previous) =>
      previous.filter((note) => note.id !== id)
    )

    if (editingNote?.id === id) {
      closeEditor()
    }
  }

  const filters = [
    'All Notes',
    'Favorites',
    'Pinned',
    ...CATEGORIES,
  ]

  return (
    <main className="notes-page">
      <header className="notes-header">
        <div>
          <p className="notes-eyebrow">YOUR PERSONAL SPACE</p>
          <h1>Notes & Ideas<span>.</span></h1>
          <p className="notes-subtitle">
            Keep your thoughts organized, one note at a time.
          </p>
        </div>

        <button
          className="notes-primary-button"
          onClick={openNewNote}
        >
          <Plus size={18} />
          New note
        </button>
      </header>

      <section className="quick-capture">
        <div className="quick-capture-icon">
          <Lightbulb size={22} />
        </div>

        <div className="quick-capture-main">
          <h2>Quick Capture</h2>
          <p>Have a thought? Save it before you forget.</p>

          <form
            className="quick-capture-form"
            onSubmit={captureIdea}
          >
            <input
              value={quickCapture}
              onChange={(event) =>
                setQuickCapture(event.target.value)
              }
              placeholder="Write down an idea or reminder..."
              aria-label="Quick capture idea"
            />

            <button
              type="submit"
              disabled={!quickCapture.trim()}
              aria-label="Save quick note"
            >
              <ArrowUpRight size={18} />
              <span>Capture</span>
            </button>
          </form>
        </div>
      </section>

      <section className="notes-toolbar">
        <div className="notes-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your notes..."
            aria-label="Search notes"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="notes-clear-search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <span className="notes-count">
          {filteredNotes.length}{' '}
          {filteredNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </section>

      <nav className="notes-filters" aria-label="Filter notes">
        {filters.map((item) => (
          <button
            key={item}
            className={`notes-filter ${
              filter === item ? 'active' : ''
            }`}
            onClick={() => setFilter(item)}
          >
            {item === 'Favorites' && <Star size={14} />}
            {item === 'Pinned' && <Pin size={14} />}
            {item}
          </button>
        ))}
      </nav>

      {filteredNotes.length > 0 ? (
        <section className="notes-grid">
          {filteredNotes.map((note) => {
            const CategoryIcon =
              CATEGORY_ICONS[note.category] || FileText

            return (
              <article
                key={note.id}
                className={`note-card ${
                  note.pinned ? 'is-pinned' : ''
                }`}
              >
                <div className="note-card-top">
                  <span
                    className={`note-category category-${(note.category || 'personal').toLowerCase()}`}
                  >
                    <CategoryIcon size={14} />
                    {note.category}
                  </span>

                  <div className="note-actions">
                    <button
                      onClick={() =>
                        toggleNoteProperty(note.id, 'favorite')
                      }
                      className={`note-action ${
                        note.favorite ? 'is-favorite' : ''
                      }`}
                      title={
                        note.favorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      aria-label="Toggle favorite"
                    >
                      <Star
                        size={17}
                        fill={note.favorite ? 'currentColor' : 'none'}
                      />
                    </button>

                    <button
                      onClick={() =>
                        toggleNoteProperty(note.id, 'pinned')
                      }
                      className={`note-action ${
                        note.pinned ? 'is-pinned-action' : ''
                      }`}
                      title={note.pinned ? 'Unpin note' : 'Pin note'}
                      aria-label="Toggle pin"
                    >
                      {note.pinned
                        ? <PinOff size={17} />
                        : <Pin size={17} />}
                    </button>
                  </div>
                </div>

                <button
                  className="note-card-content"
                  onClick={() => openEditNote(note)}
                >
                  <h3>{note.title || 'Untitled note'}</h3>
                  <p>
                    {note.content || 'No additional content.'}
                  </p>
                </button>

                <div className="note-card-footer">
                  <span>
                    {formatDate(note.updatedAt || note.createdAt)
                      ? `Edited ${formatDate(note.updatedAt || note.createdAt)}`
                      : ''}
                  </span>

                  <div className="note-footer-actions">
                    <button
                      onClick={() => openEditNote(note)}
                      className="note-edit-button"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteNote(note.id)}
                      className="note-delete-button"
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="notes-empty">
          <div className="notes-empty-icon">
            <FileText size={28} />
          </div>
          <h2>
            {search
              ? 'No notes found'
              : filter === 'All Notes'
                ? 'Your space is waiting'
                : `No ${filter.toLowerCase()} yet`}
          </h2>
          <p>
            {search
              ? 'Try another search term.'
              : 'Capture an idea or create your first note.'}
          </p>

          {!search && (
            <button
              className="notes-primary-button"
              onClick={openNewNote}
            >
              <Plus size={17} />
              Create a note
            </button>
          )}
        </section>
      )}

      {showEditor && (
        <div
          className="notes-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditor()
            }
          }}
        >
          <section
            className="notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-editor-title"
          >
            <header className="notes-modal-header">
              <div>
                <p className="notes-eyebrow">
                  {editingNote ? 'MAKE AN UPDATE' : 'SAVE A THOUGHT'}
                </p>
                <h2 id="note-editor-title">
                  {editingNote ? 'Edit note' : 'New note'}
                </h2>
              </div>

              <button
                className="note-modal-close"
                onClick={closeEditor}
                aria-label="Close editor"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveNote}>
              <label className="note-field">
                <span>Title</span>
                <input
                  autoFocus
                  value={noteForm.title}
                  onChange={(event) =>
                    setNoteForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Give your note a title"
                  maxLength={120}
                />
              </label>

              <label className="note-field">
                <span>Category</span>
                <select
                  value={noteForm.category}
                  onChange={(event) =>
                    setNoteForm((previous) => ({
                      ...previous,
                      category: event.target.value,
                    }))
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="note-field">
                <span>Content</span>
                <textarea
                  value={noteForm.content}
                  onChange={(event) =>
                    setNoteForm((previous) => ({
                      ...previous,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Start writing..."
                  rows={9}
                />
              </label>

              <div className="note-editor-options">
                <label>
                  <input
                    type="checkbox"
                    checked={noteForm.favorite}
                    onChange={(event) =>
                      setNoteForm((previous) => ({
                        ...previous,
                        favorite: event.target.checked,
                      }))
                    }
                  />
                  <Star size={16} />
                  Favorite
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={noteForm.pinned}
                    onChange={(event) =>
                      setNoteForm((previous) => ({
                        ...previous,
                        pinned: event.target.checked,
                      }))
                    }
                  />
                  <Pin size={16} />
                  Pin note
                </label>
              </div>

              <footer className="notes-modal-footer">
                <button
                  type="button"
                  className="notes-secondary-button"
                  onClick={closeEditor}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="notes-primary-button"
                  disabled={
                    !noteForm.title.trim() &&
                    !noteForm.content.trim()
                  }
                >
                  {editingNote ? 'Save changes' : 'Save note'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}