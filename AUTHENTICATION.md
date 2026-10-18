# Authentication and account ownership

Real TouchGrass features require a MongoDB account. The public Explore demo view is a read-only, bundled fictional leaderboard and has no saving, uploads, AI requests, or access to real account data. `GET /api/health` and the authentication bootstrap routes remain public. All group, check-in, leaderboard, screenshot AI and activity routes require a server session. The manual diary is a frontend-only feature behind the same login gate.

## Local setup

1. Install backend dependencies with `cd server` and `npm ci` (or use the synchronized pnpm lockfile).
2. Keep `MONGODB_URI`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, and `SESSION_SECRET` only in `server/.env`. Generate a unique session secret of at least 32 random characters for each installation; see `server/.env.example`.
3. Use `FRONTEND_ORIGINS=http://localhost:5173`, `SESSION_COOKIE_SAME_SITE=lax`, and `SESSION_COOKIE_SECURE=false` for local HTTP development. Leave `TRUST_PROXY_HOPS` empty for a direct local server.
4. Start the backend using `npm run dev` and the Vue app using its existing dev command. Use `localhost` consistently, rather than mixing it with `127.0.0.1`.
5. The frontend's public `VITE_API_BASE_URL` defaults to `http://localhost:8000/api`. This is an address, never a place to put credentials.

## Sessions, cookies and CSRF

Passwords are hashed using bcryptjs at cost 12. Passwords must contain at least 12 characters and at most 72 UTF-8 bytes (bcrypt's limit). Email addresses are trimmed, lowercased and protected by a unique MongoDB index. Password hashes are excluded from queries by default and never returned by authentication endpoints.

`express-session` stores only an opaque, signed session ID in a host-only HttpOnly cookie. Session contents, including user ID and a synchronizer CSRF token, are stored through connect-mongo in the `sessions` collection with expiry. Sessions last seven days and renew with use. Authentication regenerates the session ID; logout destroys the stored session and clears the matching cookie. No authentication token is stored in localStorage. The frontend keeps its CSRF token in memory and sends it in `X-CSRF-Token` on mutations, including login and signup. CSRF tokens are not authentication tokens.

`GET /api/auth/me` restores the current user after refresh. Login and signup return a public user and a new CSRF token. All account-specific UI is unmounted on logout/session expiry, and supported browser tabs receive a session-change notification. CORS permits only exact configured frontend origins with credentials. Authentication attempts are limited to 10 per IP per 15 minutes per backend process; this limiter is in memory, not a distributed MongoDB limiter. Use a shared rate-limit store or an edge limit before scaling across instances.

## Planned hosted configuration (not deployed)

Set `NODE_ENV=production`, a strong persistent `SESSION_SECRET`, `FRONTEND_ORIGINS=https://your-frontend.example`, and `VITE_API_BASE_URL=https://your-backend.example/api` in the respective environments. Production always uses Secure cookies. For separate cross-site frontend/backend domains, set `SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true`, and serve both over HTTPS. Set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops only if required by the actual hosting topology. Never blindly trust arbitrary forwarded headers. Test credentialed CORS, preflights, cookie delivery, CSRF rejection and logout on the real hosted domains. Some browsers block third-party cookies even with SameSite=None; prefer same-site custom domains or an API reverse proxy. Cookie domain is intentionally not expanded across subdomains.

## Identity and legacy records

New memberships contain `userId` derived exclusively from the session. New check-ins contain that user ID and the user's membership ID, also derived server-side. The personal check-in endpoint is now `/api/groups/:code/check-ins`; the old caller-selected `/members/:memberId/check-ins` endpoint is gone. AI extraction receipts are bound to the authenticated account. Group reads and leaderboard reads require membership. Joining is atomic and prevents the same account from joining twice, including concurrent requests. Equal display names are permitted because names are not identities.

Existing groups, members and check-ins are preserved unchanged. Old members have no user ID and are labelled legacy in the leaderboard. Their historical data is not attached to any account. Knowing a prior browser selection or matching a display name grants no ownership. A signed-in user with an invite code may join an old group as a new, separate member. Legacy check-ins stay with the old member and cannot be edited by that new membership. Historical screenshot records remain visible, but the competition-eligibility rollout below excludes records without known eligibility from official rankings. There is no automatic migration or ownership-claim endpoint; any future migration needs an explicit verified mapping, never a name match.

## Browser-local data

Diary storage is now keyed by account ID. Activity storage is keyed by account ID plus group/member. Another signed-in account is not shown those entries. These remain browser-local, unsynced and unencrypted; use device/browser access controls on shared devices. Logout clears the displayed state, while account-scoped saved data remains for the same user's next login. Old unscoped diary/activity storage is left untouched but is never loaded into an account automatically. There is no migration UI in this stage. Diary entries and self-reported activity completions remain outside leaderboard scoring.

## Checks

- `npm test` in `server`: offline regression/security tests; the database integration test is skipped unless opted in.
- To run the real integration test in PowerShell, set `$env:AUTH_INTEGRATION='1'`, then run `node --test auth.integration.test.js`. It uses a randomly named, separate `touchgrass_auth_test_*` database on the configured MongoDB cluster and removes only that database afterwards. Unset the environment flag afterwards. The cluster credential must permit creating/deleting that isolated test database.
- Run `npm run build` in `client-vue`.
- Before hosted release, manually verify HTTPS/proxy cookies and third-party-cookie restrictions, mobile password manager/autofill, expiry UX and the physical-phone file picker. No provider calls are necessary to test auth.

## Deliberately not implemented

No social login, password reset, email verification, account recovery, account deletion or password-change flow is included. Email ownership is unverified. Keep passwords safe: there is currently no self-service recovery. Nothing has been deployed.

## First competition week and rollout

New groups and new account memberships store the strictly following Monday in Asia/Singapore as their competition start, even when created/joined on a Monday. The effective start is the later of the group and membership dates. Later joins never change existing members or postpone the group. Check-in classification uses the screenshot usage date, not the date of submission: Sunday submitted on Monday is still practice if Sunday preceded the start. New practice/official classification is stored on the backend; clients cannot supply it. Practice is excluded from all official totals and rankings, including completed-day practice records.

On backend startup, an idempotent forward-only rollout gives existing groups and existing account-linked memberships with no eligibility date the following Monday, recorded with source `rollout` and an initialization timestamp. No old creation or join date is invented; unknown joinedAt stays unknown. Unowned legacy memberships remain unclaimed with unknown eligibility. Existing check-ins are not rewritten or deleted: records without stored practice/official provenance stay visible as historical, not retrospectively official. Repeated restarts do not push known dates forward. Only future official completed screenshot-backed records can rank, with all elapsed days required provisionally and all seven required finally.
