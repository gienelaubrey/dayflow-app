import { prisma } from '../lib/prisma.js'
import { clearSessionCookie, hashSessionToken, SESSION_COOKIE } from '../lib/session.js'
import { publicUser } from '../lib/user.js'

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE]
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' })
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    })

    if (!session) {
      clearSessionCookie(res)
      return res.status(401).json({ error: 'Authentication required.' })
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
      clearSessionCookie(res)
      return res.status(401).json({ error: 'Your session has expired.' })
    }

    req.user = session.user
    req.publicUser = publicUser(session.user)
    req.sessionRecord = session
    next()
  } catch (error) {
    next(error)
  }
}
