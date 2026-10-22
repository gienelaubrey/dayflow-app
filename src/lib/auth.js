// DayFlow frontend authentication/API client.
// In development the API defaults to localhost:4000.
// In production the app and API are served from the same origin unless VITE_API_URL is explicitly set.

const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim()
const API_URL = (
  configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:4000' : '')
).replace(/\/$/, '')
const LEGACY_USERS_KEY = 'dayflow-users'

export const DATA_KEYS = ['tasks', 'events', 'notes', 'habits', 'focus-sessions', 'goals']

export class AuthError extends Error {
  constructor(message, status = 0, details = {}) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.details = details || {}
  }
}

export const normalizeEmail = email => String(email ?? '').trim().toLowerCase()

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email ?? '').trim())
}

export function dataKey(userId, name) {
  return `dayflow:${userId}:${name}`
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function migrateLegacyLocalData(user) {
  try {
    const legacyUsers = readJson(LEGACY_USERS_KEY, [])
    const legacyUser = Array.isArray(legacyUsers)
      ? legacyUsers.find(item => normalizeEmail(item?.email) === normalizeEmail(user?.email))
      : null

    DATA_KEYS.forEach(name => {
      const destination = dataKey(user.id, name)
      if (localStorage.getItem(destination) !== null) return

      const possibleSources = []
      if (legacyUser?.id) possibleSources.push(dataKey(legacyUser.id, name))
      possibleSources.push(`dayflow-${name}`)

      const source = possibleSources.find(key => localStorage.getItem(key) !== null)
      if (source) localStorage.setItem(destination, localStorage.getItem(source))
    })
  } catch (error) {
    console.warn('Could not migrate older DayFlow local data:', error)
  }
}

export async function apiRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new AuthError(
      import.meta.env.DEV
        ? 'Could not reach the DayFlow server. Make sure the backend is running on port 4000.'
        : 'Could not reach DayFlow. Check your connection and try again.'
    )
  }

  let body = null
  if (response.status !== 204) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await response.json().catch(() => null)
    }
  }

  if (!response.ok) {
    throw new AuthError(
      body?.error || `Request failed (${response.status}).`,
      response.status,
      body || {},
    )
  }

  return body
}

export async function register({ name, email, password }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function verifyRegistration({ email, code }) {
  const body = await apiRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })

  migrateLegacyLocalData(body.user)
  return body.user
}

export async function resendRegistrationOtp({ email }) {
  return apiRequest('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function login({ email, password }) {
  const body = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  migrateLegacyLocalData(body.user)
  return body.user
}

export async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' })
}

export async function getSessionUser() {
  try {
    const body = await apiRequest('/api/auth/me')
    migrateLegacyLocalData(body.user)
    return body.user
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null
    throw error
  }
}

export async function updateProfile(userId, patch) {
  void userId

  const body = await apiRequest('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

  return body.user
}

export async function requestPasswordReset({ email }) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword({ email, code, password }) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  })
}
