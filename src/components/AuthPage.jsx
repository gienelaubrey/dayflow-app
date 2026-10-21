import { useState } from 'react'
import { Eye, EyeOff, Flower2, Heart } from 'lucide-react'
import { AuthError, login, register, validateEmail } from '../lib/auth.js'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignup = mode === 'signup'

  function update(field) {
    return event => {
      setForm(current => ({ ...current, [field]: event.target.value }))
      if (error) setError('')
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setShowPassword(false)
    setForm(current => ({ ...current, password: '', confirm: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return

    if (!validateEmail(form.email)) {
      setError('Enter a valid email address.')
      return
    }
    if (isSignup && form.password !== form.confirm) {
      setError('The passwords don’t match.')
      return
    }

    setBusy(true)
    try {
      const user = isSignup
        ? await register({ name: form.name, email: form.email, password: form.password })
        : await login({ email: form.email, password: form.password })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          <div className="brand-flower"><Flower2 size={30} /></div>
          <div>
            <h1>DayFlow</h1>
            <p>Plan · Focus · Grow</p>
          </div>
        </div>
        <div className="auth-brand-copy">
          <h2>Small steps make big progress.</h2>
          <p>
            Tasks, calendar, notes, habits, focus time and goals, all in one calm place.
          </p>
        </div>
        <p className="auth-brand-footer">
          <Heart size={14} fill="currentColor" /> Just keep showing up.
        </p>
      </aside>

      <main className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-heading">
            <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {isSignup
                ? 'Start planning your days in a minute.'
                : 'Log in to pick up where you left off.'}
            </p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          {isSignup && (
            <label>
              Your name
              <input
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
                maxLength={30}
                placeholder="e.g. Elle"
                required
                autoFocus
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              placeholder="you@example.com"
              required
              autoFocus={!isSignup}
            />
          </label>

          <label>
            Password
            <span className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                minLength={isSignup ? 8 : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {isSignup && (
            <label>
              Confirm password
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={update('confirm')}
                autoComplete="new-password"
                placeholder="Type it again"
                required
              />
            </label>
          )}

          <button className="pink-button auth-submit" type="submit" disabled={busy}>
            {busy
              ? (isSignup ? 'Creating account…' : 'Logging in…')
              : (isSignup ? 'Create account' : 'Log in')}
          </button>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to DayFlow?'}{' '}
            <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </form>
      </main>
    </div>
  )
}
