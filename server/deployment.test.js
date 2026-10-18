const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { MemoryStore } = require('express-session')
const { randomBytes } = require('node:crypto')
const { createApp } = require('./app')
const origin = 'https://touchgrass-example.vercel.app'
const env = { NODE_ENV: 'production', SESSION_SECRET: randomBytes(32).toString('hex'), FRONTEND_ORIGINS: origin, SESSION_COOKIE_SAME_SITE: 'lax', SESSION_COOKIE_SECURE: 'true', TRUST_PROXY_HOPS: '1' }

test('production session bootstrap uses host-only Secure HttpOnly Lax cookies through the TLS proxy', async () => {
  const app = createApp({ store: new MemoryStore(), env })
  const response = await request(app).get('/api/auth/me').set('X-Forwarded-Proto', 'https').set('Origin', origin)
  assert.equal(response.status, 200)
  const header = response.headers['set-cookie'][0]
  assert.match(header, /HttpOnly/); assert.match(header, /Secure/); assert.match(header, /SameSite=Lax/)
  assert.doesNotMatch(header, /Domain=/i)
  assert.equal(response.headers['access-control-allow-origin'], origin)
  assert.equal(response.headers['access-control-allow-credentials'], 'true')
  assert.equal(response.headers['cache-control'], 'no-store')
  const cookie = header.split(';')[0]
  const post = () => request(app).post('/api/auth/login').set('X-Forwarded-Proto', 'https').set('Cookie', cookie)
  assert.equal((await post().set('Origin', origin).send({})).status, 403)
  assert.equal((await post().set('Origin', 'https://untrusted.example').set('X-CSRF-Token', response.body.csrfToken).send({})).status, 403)
  // Correct CSRF reaches normal input validation; it does not bypass it.
  assert.equal((await post().set('Origin', origin).set('X-CSRF-Token', response.body.csrfToken).send({})).status, 400)
  const plain = await request(app).get('/api/auth/me').set('X-Forwarded-Proto', 'http')
  assert.equal(plain.headers['set-cookie'], undefined)
})

test('screenshot JSON envelope fits the 7 MiB parser, while oversized ordinary requests fail', async () => {
  const app = createApp({ store: new MemoryStore(), env })
  const image = 'data:image/png;base64,' + Buffer.alloc(5 * 1024 * 1024).toString('base64')
  const payload = { image }
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 7 * 1024 * 1024)
  // Unauthenticated requests stop before any provider call, after the parser accepts the size.
  assert.equal((await request(app).post('/api/screenshots/analyze').send(payload)).status, 401)
  assert.equal((await request(app).post('/api/auth/login').send({ excess: 'x'.repeat(17000) })).status, 413)
  assert.equal((await request(app).post('/api/screenshots/analyze').send({ image: 'x'.repeat(7 * 1024 * 1024) })).status, 413)
})

test('health check fails readiness when MongoDB is disconnected; unsafe proxy counts are rejected', async () => {
  const app = createApp({ store: new MemoryStore(), env })
  const response = await request(app).get('/api/health')
  assert.equal(response.status, 503)
  assert.equal(response.body.databaseConnected, false)
  for (const value of ['true', '0', '-1', '1.5']) assert.throws(() => createApp({ store: new MemoryStore(), env: { ...env, TRUST_PROXY_HOPS: value } }), /TRUST_PROXY_HOPS/)
})
