import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import Avatar from './Avatar.jsx'

export default function ProfileMenu({ user, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = event => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="profile-menu" ref={wrapper}>
      <button
        className="profile-trigger"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <Avatar user={user} />
        <ChevronDown size={15} className={open ? 'flipped' : ''} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onOpenSettings() }}
          >
            <Settings size={16} /> Settings
          </button>
          <button
            role="menuitem"
            className="danger"
            onClick={() => { setOpen(false); onLogout() }}
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
