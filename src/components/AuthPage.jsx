import { useEffect, useState } from 'react'
import { Eye, EyeOff, Flower2, Heart, KeyRound, MailCheck } from 'lucide-react'
import {
  AuthError,
  login,
  register,
  requestPasswordReset,
  resendRegistrationOtp,
  resetPassword,
  validateEmail,
  verifyRegistration,
} from '../lib/auth.js'
import '../otp-auth.css'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // login | signup | verify | forgot | reset
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  const isSignup = mode === 'signup'
  const isVerify = mode === 'verify'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(() => {
      setResendSeconds(value => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  function update(field) {
    return event => {
      setForm(current => ({ ...current, [field]: event.target.value }))
      if (error) setError('')
      if (notice) setNotice('')
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
    setOtp('')
    setShowPassword(false)
    setResendSeconds(0)
    setForm(current => ({ ...current, password: '', confirm: '' }))
  }

  function goToLoginWithNotice(message) {
    setMode('login')
    setError('')
    setNotice(message)
    setOtp('')
    setShowPassword(false)
    setResendSeconds(0)
    setForm(current => ({
      ...current,
      email: pendingEmail || current.email,
      password: '',
      confirm: '',
    }))
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return

    if (isVerify) {
      if (!/^\d{6}$/.test(otp)) {
        setError('Enter the 6-digit verification code.')
        return
      }

      setBusy(true)
      try {
        const user = await verifyRegistration({ email: pendingEmail, code: otp })
        onAuthenticated(user)
      } catch (err) {
        setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
        setBusy(false)
      }
      return
    }

    if (isForgot) {
      if (!validateEmail(form.email)) {
        setError('Enter a valid email address.')
        return
      }

      setBusy(true)
      try {
        const result = await requestPasswordReset({ email: form.email })
        setPendingEmail(form.email.trim().toLowerCase())
        setOtp('')
        setForm(current => ({ ...current, password: '', confirm: '' }))
        setResendSeconds(result?.resendAfterSeconds || 45)
        setMode('reset')
        setNotice(result?.message || 'If an account exists for that email, a reset code has been sent.')
      } catch (err) {
        setError(err instanceof AuthError ? err.message : 'Could not start password recovery.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (isReset) {
      if (!/^\d{6}$/.test(otp)) {
        setError('Enter the 6-digit reset code.')
        return
      }
      if (form.password.length < 8) {
        setError('Your password needs at least 8 characters.')
        return
      }
      if (form.password !== form.confirm) {
        setError('The passwords don’t match.')
        return
      }

      setBusy(true)
      try {
        const result = await resetPassword({
          email: pendingEmail,
          code: otp,
          password: form.password,
        })
        goToLoginWithNotice(result?.message || 'Password updated. Log in with your new password.')
      } catch (err) {
        setError(err instanceof AuthError ? err.message : 'Could not reset your password.')
      } finally {
        setBusy(false)
      }
      return
    }

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
      if (isSignup) {
        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
        })
        setPendingEmail(result.email)
        setResendSeconds(result.resendAfterSeconds || 45)
        setOtp('')
        setForm(current => ({ ...current, password: '', confirm: '' }))
        setMode('verify')
        setNotice('Verification code sent. Check your inbox.')
        setBusy(false)
        return
      }

      const user = await login({ email: form.email, password: form.password })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      if (err instanceof AuthError && err.details?.retryAfterSeconds) {
        setResendSeconds(err.details.retryAfterSeconds)
      }
      setBusy(false)
    }
  }

  async function resendRegistrationCode() {
    if (busy || resendSeconds > 0) return
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const result = await resendRegistrationOtp({ email: pendingEmail })
      setResendSeconds(result.resendAfterSeconds || 45)
      setOtp('')
      setNotice('A new verification code was sent.')
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not resend the code.')
      if (err instanceof AuthError && err.details?.retryAfterSeconds) {
        setResendSeconds(err.details.retryAfterSeconds)
      }
    } finally {
      setBusy(false)
    }
  }

  async function resendResetCode() {
    if (busy || resendSeconds > 0) return
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const result = await requestPasswordReset({ email: pendingEmail })
      setResendSeconds(result?.resendAfterSeconds || 45)
      setOtp('')
      setNotice(result?.message || 'If an account exists for that email, a reset code has been sent.')
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not request another reset code.')
    } finally {
      setBusy(false)
    }
  }

  const heading = isVerify
    ? 'Verify your email'
    : isForgot
      ? 'Forgot your password?'
      : isReset
        ? 'Reset your password'
        : isSignup
          ? 'Create your account'
          : 'Welcome back'

  const subheading = isVerify
    ? <>We sent a 6-digit code to <strong>{pendingEmail}</strong>.</>
    : isForgot
      ? 'Enter your account email and we’ll send you a reset code.'
      : isReset
        ? <>Enter the code sent to <strong>{pendingEmail}</strong> and choose a new password.</>
        : isSignup
          ? 'Start planning your days in a minute.'
          : 'Log in to pick up where you left off.'

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
            {(isVerify || isForgot || isReset) && (
              <span className="auth-verify-icon">
                {isVerify ? <MailCheck size={22} /> : <KeyRound size={22} />}
              </span>
            )}
            <h2>{heading}</h2>
            <p>{subheading}</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-notice" role="status">{notice}</div>}

          {isVerify ? (
            <>
              <label>
                Verification code
                <input
                  className="auth-otp-input"
                  value={otp}
                  onChange={event => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    if (error) setError('')
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </label>

              <button className="pink-button auth-submit" type="submit" disabled={busy || otp.length !== 6}>
                {busy ? 'Verifying…' : 'Verify email'}
              </button>

              <div className="auth-resend">
                <span>Didn't get the code?</span>
                <button type="button" onClick={resendRegistrationCode} disabled={busy || resendSeconds > 0}>
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                </button>
              </div>

              <div className="auth-verify-links">
                <button type="button" onClick={() => switchMode('signup')}>Use a different email</button>
                <span>·</span>
                <button type="button" onClick={() => switchMode('login')}>Back to log in</button>
              </div>
            </>
          ) : isForgot ? (
            <>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </label>

              <button className="pink-button auth-submit" type="submit" disabled={busy}>
                {busy ? 'Sending code…' : 'Send reset code'}
              </button>

              <div className="auth-verify-links">
                <button type="button" onClick={() => switchMode('login')}>Back to log in</button>
              </div>
            </>
          ) : isReset ? (
            <>
              <label>
                Reset code
                <input
                  className="auth-otp-input"
                  value={otp}
                  onChange={event => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    if (error) setError('')
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </label>

              <label>
                New password
                <span className="auth-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
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

              <label>
                Confirm new password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  autoComplete="new-password"
                  placeholder="Type it again"
                  minLength={8}
                  required
                />
              </label>

              <button
                className="pink-button auth-submit"
                type="submit"
                disabled={busy || otp.length !== 6}
              >
                {busy ? 'Updating password…' : 'Reset password'}
              </button>

              <div className="auth-resend">
                <span>Didn't get the code?</span>
                <button type="button" onClick={resendResetCode} disabled={busy || resendSeconds > 0}>
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                </button>
              </div>

              <div className="auth-verify-links">
                <button type="button" onClick={() => switchMode('forgot')}>Use a different email</button>
                <span>·</span>
                <button type="button" onClick={() => switchMode('login')}>Back to log in</button>
              </div>
            </>
          ) : (
            <>
              {isSignup && (
                <label>
                  Your name
                  <input
                    value={form.name}
                    onChange={update('name')}
                    autoComplete="name"
                    maxLength={50}
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

              {!isSignup && (
                <div className="auth-forgot-row">
                  <button type="button" className="auth-forgot-link" onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                </div>
              )}

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
                  ? (isSignup ? 'Sending code…' : 'Logging in…')
                  : (isSignup ? 'Create account' : 'Log in')}
              </button>

              <p className="auth-switch">
                {isSignup ? 'Already have an account?' : 'New to DayFlow?'}{' '}
                <button type="button" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
                  {isSignup ? 'Log in' : 'Create an account'}
                </button>
              </p>
            </>
          )}
        </form>
      </main>
    </div>
  )
}
