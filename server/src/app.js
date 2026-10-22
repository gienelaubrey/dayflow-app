import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import eventRoutes from './routes/events.js'
import noteRoutes from './routes/notes.js'
import habitRoutes from './routes/habits.js'
import { prisma } from './lib/prisma.js'

export const app = express()

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.disable('x-powered-by')
app.use(cors({
  origin: clientOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '3mb' }))
app.use(cookieParser())

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, service: 'dayflow-api', database: 'connected' })
  } catch {
    res.status(503).json({ ok: false, service: 'dayflow-api', database: 'unavailable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/notes', noteRoutes)
app.use('/api/habits', habitRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) return next(error)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})
