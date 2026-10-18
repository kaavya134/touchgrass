const { randomBytes, timingSafeEqual } = require('crypto')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const { rateLimit } = require('express-rate-limit')
const express = require('express')
const User = require('./models/User')
const publicUser = user => ({ id: String(user._id), displayName: user.displayName, email: user.email })
const dummyHash = bcrypt.hash('dummy-password-for-constant-work', 12)
function authConfig(env = process.env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 random characters.')
  const production = env.NODE_ENV === 'production'
  const origins = (env.FRONTEND_ORIGINS || (production ? '' : 'http://localhost:5173')).split(',').map(s => s.trim()).filter(Boolean)
  if (!origins.length || origins.includes('*') || origins.some(origin => { try { return new URL(origin).origin !== origin || (production && !origin.startsWith('https://')) } catch { return true } })) throw new Error('Set exact FRONTEND_ORIGINS (HTTPS in production).')
  const secure = production || env.SESSION_COOKIE_SECURE === 'true'
  const sameSite = env.SESSION_COOKIE_SAME_SITE || 'lax'
  if (!['lax','strict','none'].includes(sameSite) || (sameSite === 'none' && !secure)) throw new Error('Cross-site cookies require SameSite=None and Secure=true.')
  const cookie = { httpOnly: true, secure, sameSite, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
  return { origins, cookie, secret: env.SESSION_SECRET, trustProxy: env.TRUST_PROXY_HOPS ? Number(env.TRUST_PROXY_HOPS) : false }
}
function sessionMiddleware(config, store) {
  return session({ name: 'touchgrass.sid', secret: config.secret, store, resave: false, saveUninitialized: false, rolling: true, cookie: config.cookie })
}
function csrfToken(req) { return req.session.csrfToken || (req.session.csrfToken = randomBytes(32).toString('hex')) }
function csrfProtection(config) {
  return (req, res, next) => {
    if (['GET','HEAD','OPTIONS'].includes(req.method)) return next()
    const origin = req.get('Origin')
    if (origin && !config.origins.includes(origin)) return res.status(403).json({ message: 'Request origin is not allowed.' })
    const supplied = req.get('X-CSRF-Token')
    const expected = req.session.csrfToken
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !expected || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(403).json({ message: 'Security token expired. Refresh and try again.', code: 'CSRF_INVALID' })
    next()
  }
}
async function currentUser(req, res, next) {
  try {
    req.user = req.session.userId ? await User.findById(req.session.userId) : null
    next()
  } catch { res.status(503).json({ message: 'Could not verify your session. Please retry.' }) }
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Please log in to continue.' })
  next()
}
async function establishSession(req, user) {
  await new Promise((resolve,reject) => req.session.regenerate(error => error ? reject(error) : resolve()))
  req.session.userId = String(user._id)
  const token = csrfToken(req)
  await new Promise((resolve,reject) => req.session.save(error => error ? reject(error) : resolve()))
  return { user: publicUser(user), csrfToken: token }
}
function createAuthRouter(config) {
  const router = express.Router()
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many authentication attempts. Try again in 15 minutes.' } })
  router.get('/csrf', (req,res) => res.json({ csrfToken: csrfToken(req) }))
  router.get('/me', (req,res) => res.json({ user: req.user ? publicUser(req.user) : null, csrfToken: csrfToken(req) }))
  router.post('/signup', limit, async (req,res) => {
    const { displayName, email, password } = req.body || {}
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 60 || typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password,'utf8') > 72) return res.status(400).json({ message: 'Enter a display name (1–60 characters), a valid email, and a password of at least 12 characters (at most 72 UTF-8 bytes).' })
    try {
      const user = await User.create({ displayName: displayName.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password,12) })
      res.status(201).json(await establishSession(req,user))
    } catch (error) { res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'An account with that email already exists. Log in instead.' : 'Could not create your account. Please retry.' }) }
  })
  router.post('/login', limit, async (req,res) => {
    const { email, password } = req.body || {}
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || Buffer.byteLength(password,'utf8') > 72) return res.status(400).json({ message: 'Enter your email and password.' })
    try {
      const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
      const valid = await bcrypt.compare(password, user?.passwordHash || await dummyHash)
      if (!user || !valid) return res.status(401).json({ message: 'Email or password is incorrect.' })
      res.json(await establishSession(req,user))
    } catch { res.status(500).json({ message: 'Could not log in. Please retry.' }) }
  })
  router.post('/logout', requireAuth, async (req,res) => {
    req.session.destroy(error => {
      if (error) return res.status(500).json({ message: 'Could not log out. Please retry.' })
      const { maxAge, ...clearOptions } = config.cookie
      res.clearCookie('touchgrass.sid', clearOptions)
      res.json({ message: 'Logged out.' })
    })
  })
  return router
}
module.exports = { authConfig, sessionMiddleware, csrfProtection, currentUser, requireAuth, createAuthRouter }
