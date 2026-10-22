function parsePositiveInt(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function configuredClientOrigins() {
  const raw = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')
  return new Set(
    raw
      .split(',')
      .map(value => value.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
}

function requestOrigin(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim()
  const protocol = forwardedProto || req.protocol
  const host = req.get('host')
  return host ? `${protocol}://${host}` : ''
}

export function corsOptions() {
  const allowed = configuredClientOrigins()

  return {
    credentials: true,
    origin(origin, callback) {
      // Non-browser clients and same-origin browser requests do not need CORS.
      if (!origin) return callback(null, true)
      return callback(null, allowed.has(origin.replace(/\/$/, '')))
    },
  }
}

export function requireTrustedOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const origin = req.get('origin')
  if (!origin) return next() // Allows curl/server-to-server clients.

  const normalized = origin.replace(/\/$/, '')
  const sameOrigin = requestOrigin(req).replace(/\/$/, '')
  const allowed = configuredClientOrigins()

  if (normalized === sameOrigin || allowed.has(normalized)) return next()
  return res.status(403).json({ error: 'Request origin is not allowed.' })
}

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }

  next()
}

export function noStoreApiResponses(req, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 300,
  prefix = 'api',
} = {}) {
  const buckets = new Map()
  let lastSweep = Date.now()

  return function rateLimiter(req, res, next) {
    const now = Date.now()

    if (now - lastSweep > windowMs) {
      for (const [key, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(key)
      }
      lastSweep = now
    }

    const key = `${prefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`
    let entry = buckets.get(key)

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      buckets.set(key, entry)
    }

    entry.count += 1
    const remaining = Math.max(0, max - entry.count)
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))

    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(remaining))
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > max) {
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }

    next()
  }
}

export function apiRateLimiter() {
  return createRateLimiter({
    max: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 600),
    windowMs: 15 * 60 * 1000,
    prefix: 'api',
  })
}

export function authRateLimiter() {
  return createRateLimiter({
    max: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 60),
    windowMs: 15 * 60 * 1000,
    prefix: 'auth',
  })
}
