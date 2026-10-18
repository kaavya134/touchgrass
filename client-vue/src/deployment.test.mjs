import test from 'node:test'
import assert from 'node:assert/strict'
import { createDeploymentConfig } from '../deployment-config.mjs'

const env = { VITE_API_BASE_URL: '/api', RENDER_API_ORIGIN: 'https://touchgrass-example.onrender.com' }
test('same-origin API proxy precedes SPA fallback and never caches session responses', () => {
  const config = createDeploymentConfig(env)
  assert.deepEqual(config.rewrites[0], { source: '/api/:path*', destination: 'https://touchgrass-example.onrender.com/api/:path*' })
  assert.equal(config.rewrites[1].destination, '/index.html')
  assert.equal(config.installCommand, 'npx --yes pnpm@10.34.7 install --frozen-lockfile')
  assert.equal(config.buildCommand, 'npx --yes pnpm@10.34.7 run build')
  assert.ok(config.headers[0].headers.some(h => h.key === 'Cache-Control' && h.value === 'no-store'))
  assert.ok(config.headers[0].headers.some(h => h.key === 'x-vercel-enable-rewrite-caching' && h.value === '0'))
  assert.equal(config.functions, undefined)
})
test('deployment fails closed for missing or unsafe routing environment without exposing values', () => {
  for (const origin of ['', 'not-a-url', 'http://example.test', 'https://user:private@example.test', 'https://example.test/api', 'https://example.test?token=private']) {
    assert.throws(() => createDeploymentConfig({ ...env, RENDER_API_ORIGIN: origin }), error => !error.message.includes('private') && /RENDER_API_ORIGIN/.test(error.message))
  }
  for (const base of [undefined, 'http://localhost:8000/api', 'https://example.test/api']) {
    assert.throws(() => createDeploymentConfig({ ...env, VITE_API_BASE_URL: base }), /VITE_API_BASE_URL/)
  }
})


test('production proxy targets the deployed Render backend by default', () => {
  const config = createDeploymentConfig({ VITE_API_BASE_URL: '/api' })
  assert.equal(config.rewrites[0].destination, 'https://touchgrass-api-7x8m.onrender.com/api/:path*')
})
