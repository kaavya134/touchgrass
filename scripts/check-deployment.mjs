// Public-origin checks only. Never reads .env, logs cookies/tokens, creates accounts,
// saves check-ins, or calls AI. Session bootstrap creates an anonymous server session.
import assert from 'node:assert/strict'
const input = process.argv[2]
let origin
try {
  const url = new URL(input)
  assert.ok(url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash)
  origin = url.origin
} catch {
  console.error('Usage: node scripts/check-deployment.mjs https://your-production-frontend.vercel.app')
  process.exit(1)
}
async function call(path, options = {}) {
  return fetch(`${origin}/api${path}`, { redirect: 'error', signal: AbortSignal.timeout(90000), ...options })
}
async function main() {
  const health = await call('/health')
  assert.equal(health.status, 200, 'API health must be ready through the frontend proxy')
  const healthData = await health.json()
  assert.equal(healthData.service, 'touchgrass')
  assert.equal(healthData.databaseConnected, true)
  console.log('PASS API proxy and MongoDB readiness')

  const bootstrap = await call('/auth/me', { headers: { Origin: origin } })
  assert.equal(bootstrap.status, 200)
  assert.equal(bootstrap.headers.get('access-control-allow-origin'), origin)
  assert.equal(bootstrap.headers.get('access-control-allow-credentials'), 'true')
  assert.match(bootstrap.headers.get('cache-control') || '', /no-store/)
  const sessionCookie = bootstrap.headers.getSetCookie().find(value => value.startsWith('touchgrass.sid='))
  assert.ok(sessionCookie, 'Session cookie was not set; verify HTTPS and proxy trust')
  for (const flag of [/HttpOnly/i, /Secure/i, /SameSite=Lax/i]) assert.match(sessionCookie, flag)
  assert.doesNotMatch(sessionCookie, /Domain=/i)
  const cookie = sessionCookie.split(';')[0]
  const { csrfToken, user } = await bootstrap.json()
  assert.equal(user, null)
  assert.match(csrfToken, /^[a-f0-9]{64}$/)
  const restored = await call('/auth/me', { headers: { Cookie: cookie, Origin: origin } })
  assert.equal(restored.status, 200)
  assert.equal((await restored.json()).csrfToken, csrfToken, 'Session did not survive the proxied round trip')
  console.log('PASS host-only Secure/HttpOnly/Lax cookie and persistent anonymous session')

  const post = headers => call('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers }, body: '{}' })
  assert.equal((await post({ Origin: origin })).status, 403, 'Missing CSRF must be rejected')
  assert.equal((await post({ Origin: 'https://untrusted.invalid', 'X-CSRF-Token': csrfToken })).status, 403, 'Untrusted origins must be rejected')
  assert.equal((await post({ Origin: origin, 'X-CSRF-Token': csrfToken })).status, 400, 'Valid CSRF must reach normal input validation')
  assert.equal((await call('/groups', { headers: { Cookie: cookie } })).status, 401)
  console.log('PASS CSRF, exact origin allowlist, and real-feature authentication')

  const image = 'x'.repeat(Math.ceil(5 * 1024 * 1024 / 3) * 4 + 22)
  const upload = await call('/screenshots/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ image })
  })
  assert.equal(upload.status, 401, 'Synthetic screenshot-sized JSON should reach auth, not hit a proxy size limit')
  console.log('PASS approximately 6.67 MiB synthetic request through the proxy; no provider call')
  console.log('Public-origin checks passed. Still verify login/logout and the file picker in a real browser.')
}
main().catch(() => { console.error('Deployment check failed. Verify health, routing, exact FRONTEND_ORIGINS, cookie/proxy settings, and platform logs. No response bodies or credentials were printed.'); process.exitCode = 1 })
