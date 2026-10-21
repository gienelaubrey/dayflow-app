// DayFlow account layer.
//
// Right now accounts live in this browser's localStorage so the app works
// without a server. Every function is async and returns plain objects, so when
// the backend is ready you only need to replace the bodies below with fetch()
// calls. Nothing else in the app needs to change.
//
// NOTE: this is NOT real security. Anyone with access to the browser can read
// this data. Real authentication needs the backend (hashed passwords on the
// server, httpOnly session cookies or tokens).

const USERS_KEY = 'dayflow-users'
const SESSION_KEY = 'dayflow-session'

export const DATA_KEYS = ['tasks', 'events', 'notes', 'habits', 'focus-sessions', 'goals']

export class AuthError extends Error {}

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
const fromHex = hex => new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)))

async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256
  )
  return { salt: toHex(salt), hash: toHex(new Uint8Array(bits)) }
}

// Never hand the password hash to the UI.
const publicUser = ({ passwordHash, salt, ...user }) => user

export const normalizeEmail = email => email.trim().toLowerCase()

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export function dataKey(userId, name) {
  return `dayflow:${userId}:${name}`
}

// The first account created on this browser adopts any data saved before
// accounts existed (the old un-prefixed "dayflow-tasks" style keys).
function adoptLegacyData(userId) {
  DATA_KEYS.forEach(name => {
    const legacyKey = `dayflow-${name}`
    const value = localStorage.getItem(legacyKey)
    if (value !== null) {
      localStorage.setItem(dataKey(userId, name), value)
      localStorage.removeItem(legacyKey)
    }
  })
  localStorage.removeItem('dayflow-settings')
}

export async function register({ name, email, password }) {
  const cleanName = name.trim()
  if (!cleanName) throw new AuthError('Enter your name.')
  if (!validateEmail(email)) throw new AuthError('Enter a valid email address.')
  if (password.length < 8) throw new AuthError('Your password needs at least 8 characters.')

  const users = readUsers()
  const normalized = normalizeEmail(email)
  if (users.some(user => user.email === normalized)) {
    throw new AuthError('An account with this email already exists. Try logging in instead.')
  }

  const { salt, hash } = await hashPassword(password)
  const user = {
    id: crypto.randomUUID(),
    name: cleanName,
    email: normalized,
    avatar: null,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: hash,
  }

  if (users.length === 0) adoptLegacyData(user.id)
  writeUsers([...users, user])
  localStorage.setItem(SESSION_KEY, user.id)
  return publicUser(user)
}

export async function login({ email, password }) {
  const normalized = normalizeEmail(email)
  const user = readUsers().find(item => item.email === normalized)
  const generic = new AuthError('Incorrect email or password.')
  if (!user) throw generic

  const { hash } = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) throw generic

  localStorage.setItem(SESSION_KEY, user.id)
  return publicUser(user)
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export async function getSessionUser() {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const user = readUsers().find(item => item.id === id)
  if (!user) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return publicUser(user)
}

export async function updateProfile(userId, patch) {
  const users = readUsers()
  const index = users.findIndex(user => user.id === userId)
  if (index === -1) throw new AuthError('Your account could not be found. Please log in again.')

  const next = { ...users[index] }
  if ('name' in patch) {
    const cleanName = patch.name.trim()
    if (!cleanName) throw new AuthError('Your name can’t be empty.')
    next.name = cleanName
  }
  if ('avatar' in patch) next.avatar = patch.avatar || null

  users[index] = next
  try {
    writeUsers(users)
  } catch {
    throw new AuthError('There isn’t enough browser storage left to save this change.')
  }
  return publicUser(next)
}
