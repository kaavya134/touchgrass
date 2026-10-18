// Build-time routing only. This file is not imported into the browser bundle.
export const DEFAULT_RENDER_API_ORIGIN = 'https://touchgrass-api-7x8m.onrender.com'
export function createDeploymentConfig(env) {
  if (env.VITE_API_BASE_URL !== '/api') throw new Error('Set VITE_API_BASE_URL=/api for the same-origin production API proxy.')
  let origin
  try { origin = new URL(env.RENDER_API_ORIGIN ?? DEFAULT_RENDER_API_ORIGIN) } catch { throw new Error('Set RENDER_API_ORIGIN to the HTTPS origin of the Render web service.') }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('RENDER_API_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment.')
  }
  return {
    framework: 'vite',
    installCommand: 'npx --yes pnpm@10.34.7 install --frozen-lockfile',
    buildCommand: 'npx --yes pnpm@10.34.7 run build',
    outputDirectory: 'dist',
    rewrites: [
      { source: '/api/:path*', destination: `${origin.origin}/api/:path*` },
      { source: '/:path*', destination: '/index.html' }
    ],
    headers: [{ source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'x-vercel-enable-rewrite-caching', value: '0' }
    ] }]
  }
}
