import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import eventRoutes from './routes/events.js'
import noteRoutes from './routes/notes.js'
import habitRoutes from './routes/habits.js'
import focusSessionRoutes from './routes/focus-sessions.js'
import goalRoutes from './routes/goals.js'
import { prisma } from './lib/prisma.js'
import {
  apiRateLimiter,
  authRateLimiter,
  corsOptions,
  noStoreApiResponses,
  requireTrustedOrigin,
  securityHeaders,
} from './middleware/security.js'

export const app = express()

app.disable('x-powered-by')
// Render and most production reverse proxies forward the real client IP/protocol.
app.set('trust proxy', 1)

app.use(securityHeaders)
app.use(cors(corsOptions()))
app.use(requireTrustedOrigin)
app.use(express.json({ limit: '3mb' }))
app.use(cookieParser())
app.use('/api', noStoreApiResponses, apiRateLimiter())

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, service: 'dayflow-api', database: 'connected' })
  } catch {
    res.status(503).json({ ok: false, service: 'dayflow-api', database: 'unavailable' })
  }
})

app.use('/api/auth', authRateLimiter(), authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/notes', noteRoutes)
app.use('/api/habits', habitRoutes)
app.use('/api/focus-sessions', focusSessionRoutes)
app.use('/api/goals', goalRoutes)

// In production DayFlow is served by the same Express service as the API.
// This keeps session cookies first-party and avoids cross-site auth issues.
if (process.env.NODE_ENV === 'production') {
  const distPath = fileURLToPath(new URL('../../dist/', import.meta.url))
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (path.basename(filePath).match(/\.[A-Za-z0-9_-]{8,}\.(js|css)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }))

  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) return next(error)

  if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) {
    return res.status(400).json({ error: 'Invalid JSON request body.' })
  }

  res.status(500).json({ error: 'Something went wrong on the server.' })
})
