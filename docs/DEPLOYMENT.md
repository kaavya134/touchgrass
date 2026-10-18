# Deploy TouchGrass: Vercel frontend + Render backend

Target repository: `https://github.com/kaavya134/touchgrass`, production branch `master`.

## Architecture

The browser calls the Vercel site's `/api` path. `client-vue/vercel.mjs` evaluates public routing environment variables at build time and rewrites that path directly to the Render service's `/api` path. This is an external CDN rewrite, not a Vercel Function or routing middleware. The SPA fallback comes after the API rule. Both the API and proxy disable caching for API responses.

Cookies have no Domain attribute, so proxied responses set a cookie for the frontend host. Keep `HttpOnly`, `Secure`, `SameSite=Lax`, cookie sessions, exact origin checks, and CSRF tokens. Axios already uses credentials and `X-CSRF-Token`. No session token is added to localStorage. Do not switch the browser API URL directly to Render for this topology.

There was no hosting configuration before this preparation. These settings have offline checks; live platform, cookie, and browser checks remain required.

## Hosting settings

| Setting | Render | Vercel |
| --- | --- | --- |
| Service type | Web Service, Node | Vite project |
| Repository branch | `master` | `master` (Production Branch) |
| Root directory | `server` | `client-vue` |
| Node.js | `24.x` from package engines | `24.x` |
| Install/build | `npm ci --omit=dev` | Install: `pnpm install --frozen-lockfile` |
| Build command | The install above; no compilation | `pnpm run build` |
| Start command | `npm start` | Not applicable |
| Output directory | Not applicable | `dist` |
| Health check | `/api/health` | Check the proxied `/api/health` |
| Region | Singapore if offered for the selected plan | Static frontend/CDN; backend stays on Render |

Render supplies `PORT`; the server binds it on `0.0.0.0`. Do not run `npm run dev`, database integration tests, or screenshot live tests during the hosting build. No persistent disk is needed: MongoDB stores accounts, groups, check-ins, and sessions. Images are sent for analysis, not saved as files by this app.

The frontend pins pnpm 12.3.4. Keep both existing lockfiles; Corepack and the explicit install command resolve package-manager ambiguity.

## Environment variables

Enter actual confidential values only in Render's dashboard. Never put them in Git, Vercel, chat, screenshots, or `VITE_` variables.

| Render variable NAME | Setting or source |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Existing intended MongoDB connection string; confidential |
| `SESSION_SECRET` | Existing strong, stable secret from the local backend environment, or privately generated once; at least 32 random characters. Keep stable across deploys. |
| `AI_BASE_URL` | Existing provider base endpoint, reachable from Render |
| `AI_MODEL` | Existing compatible vision/JSON model configuration |
| `AI_API_KEY` | Existing provider credential; confidential |
| `FRONTEND_ORIGINS` | Exact production HTTPS frontend origin, no trailing slash or wildcard. Until Vercel assigns the domain, use `https://touchgrass-setup.invalid`, then replace it and redeploy Render before login checks. |
| `SESSION_COOKIE_SAME_SITE` | `lax` |
| `SESSION_COOKIE_SECURE` | `true` |
| `TRUST_PROXY_HOPS` | Start at `1`: trust the immediate Render proxy, not every forwarded address. Verify secure cookies and rate limiting on the live path; do not increase it blindly for Vercel. |

Do not set `AUTH_INTEGRATION=1`. Leave `PORT` to Render. No MongoDB credentials or session secrets are needed on Vercel.

| Vercel variable NAME | Setting or source (Production environment) |
| --- | --- |
| `VITE_API_BASE_URL` | `/api` |
| `RENDER_API_ORIGIN` | The public HTTPS Render service origin, no `/api`, path, credentials, query, or fragment |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

`RENDER_API_ORIGIN` is read only by the deployment config; it is not a browser secret. The production config fails closed if it is missing or the browser API base is not `/api`. Do not add AI credentials, MongoDB credentials, or `SESSION_SECRET` to Vercel. Only production needs access initially. Preview deployments should use a separate backend/database and exact preview origins if enabled later; do not wildcard-allow preview URLs.

## Dashboard sequence

1. Render: New -> Web Service -> connect GitHub -> select this repository. Stop at the settings form to confirm root, branch, build, start command, health path, region, and plan.
2. Fill Render settings and variable names above, using the temporary `.invalid` frontend origin if necessary. If using MongoDB Atlas, add only Render's advertised outbound IP ranges to the intended cluster's Network Access allowlist and confirm the database user has the needed permissions. Do not delete groups, reset the database, or open network access to all addresses as a shortcut.
3. Create/deploy the Render service, then obtain its public `https://...onrender.com` origin. Health must report ready with `databaseConnected: true`. Startup initializes indexes and retains the existing forward-only eligibility initialization; check-ins and groups are not deleted.
4. Vercel: Add New -> Project -> import the same repository. Set Root Directory `client-vue`, Framework Vite, Node 24.x, the commands above, and the three Vercel variables for Production. Confirm `master` is the production branch and deploy.
5. Take Vercel's actual stable production origin (not a per-commit preview URL). Replace `FRONTEND_ORIGINS` in Render with that exact origin and save/redeploy. Keep `SESSION_COOKIE_SAME_SITE=lax`. A custom domain added later must be explicitly allowed as well.
6. Run the public-origin checks below, then use a real browser for login, refresh, logout, demo, and screenshot/activity behavior. Warm the backend first if using Render Free.

Creation/upgrade of a paid service is the user's dashboard choice. Render Free idles after 15 minutes; a restart takes about a minute and can exhaust client timeouts. For tonight's demonstration, open health and wait for readiness before testing; Free is not an uptime guarantee. A paid always-on instance avoids idle spin-down, but must be explicitly chosen by the account owner.

## Size and time budgets

- The frontend accepts PNG/JPEG/WebP files up to 5 MiB. Base64 expands that to roughly 6.67 MiB plus JSON metadata, within the screenshot endpoint's 7 MiB Express parser limit. Other JSON routes remain 16 KiB. A new test checks these boundaries without calling AI.
- Provider requests have a 60-second abort signal covering response headers and body reads. Provider timeout errors are sanitized and returned as 504. Screenshot/activity clients use a 70-second timeout.
- Vercel documents a 120-second external-origin time-to-first-byte limit. Cold Render startup plus an AI request can exceed the client budget; warm the service before trying again rather than removing timeouts.
- Vercel's 4.5 MB Function payload limit is why the proxy is an external rewrite, not a function. Actual hosted upload acceptance still needs the synthetic public-path check and a browser file-picker check. No routing middleware is included.

## Verification

Offline from the root:

```powershell
$env:AUTH_INTEGRATION='0'
npm test --prefix server
node --test client-vue/src/*.test.mjs
cd client-vue
pnpm install --frozen-lockfile
$env:VITE_API_BASE_URL='/api'
pnpm run build
```

The MongoDB integration test stays skipped. Use the same-origin production build for the deployed frontend; local development can retain the example's localhost API setting.

After both hosts are ready:

```powershell
node scripts/check-deployment.mjs https://your-production-frontend.vercel.app
```

This checks proxy health and MongoDB readiness, host-only cookie flags, anonymous session persistence, exact-origin and CSRF rejection, protected routes, and an approximately 6.67 MiB synthetic request. It never prints cookies/tokens, creates accounts/groups, saves check-ins, or calls AI. It does create an anonymous MongoDB session through the normal bootstrap endpoint and consumes one invalid login attempt in the rate limiter.

Finally, in the browser verify signup/login as intended, refresh preserves login, logout clears it, failed CSRF cannot mutate data, the demo remains labelled/read-only, and one deliberate screenshot/activity request works. Check a physical phone too. Do not share environment screenshots or cookie/header values. Public URLs, HTTP status codes, and redacted error messages are enough for troubleshooting.

## Official references

- [Vercel external rewrites and disabling rewrite caching](https://vercel.com/docs/routing/rewrites)
- [Build-time programmatic Vercel configuration](https://vercel.com/docs/project-configuration/vercel-ts)
- [Corepack and build configuration](https://vercel.com/docs/builds/configure-a-build)
- [Vercel Function payload limits](https://vercel.com/docs/functions/limitations)
- [Vercel external-origin timeout](https://vercel.com/changelog/cdn-origin-timeout-increased-to-two-minutes)
- [Render Express setup](https://render.com/docs/deploy-node-express-app)
- [Render port binding](https://render.com/docs/web-services)
- [Render outbound IP allowlists](https://render.com/docs/outbound-ip-addresses)
- [Vercel Node version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Render Node version selection](https://render.com/docs/node-version)
- [Render Free idle behavior](https://render.com/docs/free)
- [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/)
