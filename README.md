# TouchGrass

A hackathon project that turns reducing social media use into a friendly group challenge, with personal reflection and ideas for life beyond the screen.

**Website:** [touchgrass-beige.vercel.app](https://touchgrass-beige.vercel.app)

**Repository:** [github.com/kaavya134/touchgrass](https://github.com/kaavya134/touchgrass)

**For judges:** open the website and choose **Explore demo** on the login screen. No account is needed for the fictional sample week. The website and API health endpoints responded successfully during the documentation check on 18 October 2026; this establishes availability, **not verification of every hosted feature**. See the testing status in Section 7. Render's Free backend can take time to wake after inactivity; wait and retry if the first connection is slow.

## 1. Problem Statement

Doomscrolling can turn a quick social media check into much more time on a phone than intended. Recognising that habit does not automatically make it easy to change: a screen-time number alone offers little motivation, and putting the phone down can leave the question of what to do instead.

I experienced this myself and wanted an incentive to put my phone down. TouchGrass grew from that personal problem: make reducing social media usage a shared challenge with friends, add accountability through daily check-ins, and offer small alternatives to scrolling. The project does not claim a measured reduction in usage or invent statistics about its impact.

## 2. Solution Overview

TouchGrass combines four things in one place:

- **Friendly group challenges:** create a group, invite friends, and choose a custom forfeit for the final eligible member with the highest weekly social usage.
- **Screenshot-backed tracking:** explicitly analyse a daily screen-time screenshot, review the extracted Social / Social Networking usage, and confirm before saving a check-in.
- **Personal reflection:** manually log total phone usage and reflect on what encouraged scrolling or helped with disconnecting.
- **Offline activity suggestions:** choose interests, available time, company, and setting to request three activities that fit a short break.

The Vue frontend communicates with an authenticated Express API. MongoDB stores accounts, sessions, groups, and screenshot check-ins. The personal diary and saved activities remain in account-scoped browser storage. These different kinds of data are deliberately kept separate: only eligible, completed screenshot-backed social usage affects group rankings.

## 3. Key Features

### Accounts and groups

- Sign up with a display name, email, and password; log in and log out using server sessions.
- Create a group with a custom name and forfeit, or join using a six-character invite code.
- View the signed-in account's memberships and switch between groups. Membership and check-in ownership come from the authenticated account, not a submitted display name.
- Copy an invite code, with a manual selection fallback if clipboard access is unavailable.

### Screenshot check-ins

- Choose a PNG, JPEG, or WebP screenshot, preview it, then click **Analyse screenshot**. Desktop drag-and-drop and keyboard file selection are implemented.
- Extract daily **Social / Social Networking** category usage and the screenshot date. Total phone usage, weekly totals, and configured app limits are not substitutes for the required category.
- Review the extracted date, duration, and status, then click **Confirm and save**. Selecting a file alone does not call AI or save a check-in.
- Today's check-in is **provisional**; yesterday's is a **completed-day** submission. Date rules use **Asia/Singapore**, including submitting Sunday's completed usage on Monday.
- A fresh analysis for an accepted date can replace that date's existing check-in. Weekly history distinguishes missing, provisional, completed, practice, historical, and upcoming records as applicable.

### Weekly rankings and eligibility

- Monday-Sunday leaderboards compare the sum of **completed, official daily social-media minutes**. Lower totals rank higher, with a podium and daily breakdowns.
- New groups and memberships begin competition on the **strictly following Monday**, even if created or joined on a Monday. Until eligible, check-ins are practice and do not enter official rankings.
- Effective eligibility uses the later of the group and member start dates. A later newcomer does not postpone existing members' competition.
- During a week, a member needs every elapsed required competition day to rank. Final standings require all seven completed days. **Missing days are not zero.**
- Equal totals share a rank. A tied highest total does not select an arbitrary single loser; fewer than two eligible members also produces no single loser. The custom forfeit is displayed, not automatically charged or enforced.
- Historical records and unowned legacy memberships are preserved without claiming that unknown past eligibility was official or attaching old data to a matching display name.

### Personal diary and activities

- The diary has a selectable Monday-Sunday strip, previous/next week controls, selected-day editing, hours/minutes inputs, a clickable weekly bar chart, explicit save/update feedback, and optional reflection prompts that append only when clicked.
- Diary entries cover **manually logged total phone usage**, unlike ranked Social-category check-ins. Weekly averages include only logged days, including explicitly logged zeroes; unlogged days stay missing. Diary dates follow the browser's local calendar.
- Activity preferences include Outdoors, Fitness, Creative, Relaxing, and Social; 10/20/30/60-minute budgets; Solo / With friends; and Indoors / Outdoors.
- An explicit request generates three cards with descriptions, durations, first steps, and completion/undo controls. The current set shows **X of 3 completed**, which is self-reported progress, not verified offline time.
- A generation error exposes clearly labelled **built-in suggestions (not AI-generated)**. Generating a new set replaces the saved set.

### Responsive interface and Explore demo

The application includes desktop/mobile layouts, the forest-green/cream theme with sage, mustard, and peach accents, Lucide icons paired with labels, focus styles, disclosures, and reduced-motion support. Responsive styling is implemented; complete rendered-device verification remains pending.

To explore without registering:

1. Open the [website](https://touchgrass-beige.vercel.app).
2. Select **Explore demo** on the login screen, or while session restoration is loading.
3. Inspect the four fictional members, completed Monday-Sunday week, daily values, weekly totals, podium, and picnic-themed custom forfeit.
4. Select **Exit demo** to return to login or the existing signed-in session.

The demo is persistently labelled **Demo · sample data**. Its bundled fixture is generated offline with the same ranking function as the real leaderboard. It has no upload/save controls, does not call AI, and does not read or write real groups, rankings, or browser diary/activity storage. Normal app session bootstrap can still occur independently. Developers can regenerate the fictional fixture with `node scripts/generate-demo.cjs`; the inputs are in [scripts/demo-data.cjs](scripts/demo-data.cjs).

## 4. AI Integration

The submission's stated provider/model configuration is **APIyi**, using an **OpenAI-compatible API**, with **`gpt-4o-mini`** selected through `AI_MODEL`. The backend sends HTTP Chat Completions requests to `AI_BASE_URL` plus `/chat/completions`, including image input when analysing screenshots and requesting JSON output.

**Configuration verification:** the committed [server/.env.example](server/.env.example) intentionally contains a generic provider URL and model placeholder. Mocked screenshot/activity tests reference `gpt-4o-mini`, and the safe setup example below shows that model name. Neither confirms which model a live provider actually serves. Private `.env` files and deployed secret settings were not inspected for this README; APIyi/model identification follows the submission configuration supplied by the developer.

This uses an existing **pretrained model**. No model was trained or fine-tuned for TouchGrass, and the repository contains no training pipeline.

### Flow A: screenshot to confirmed check-in

```text
User selects a daily screenshot
  -> explicit Analyse screenshot action
  -> authenticated backend sends image + extraction instructions to APIyi
  -> backend parses and validates date, minutes, and response structure
  -> frontend displays extracted values for review
  -> user clicks Confirm and save
  -> backend verifies the signed analysis receipt and current date rules
  -> MongoDB check-in is created or replaced for that member/date
```

The extraction prompt supplies a Singapore reference date, asks for daily Social-category usage, instructs the model to treat screenshot text as data rather than instructions, and requests null for unclear values. Valid, saveable results receive an account-bound signed analysis receipt. Saving submits that receipt rather than editable date or usage fields. The server rechecks account ownership, accepted dates, submission status, value bounds, and replay protection before persistence.

### Flow B: preferences to offline suggestions

```text
Selected interests + time + company + setting
  -> explicit Suggest activities action
  -> backend validates an allowlisted preference object
  -> APIyi returns three structured activity suggestions
  -> backend validates the result against the selected preferences
  -> frontend displays the cards and stores the current set locally
```

The validator requires exactly three distinct titles, bounded text fields, appropriate category/company/location, and positive whole-minute durations within the selected budget. The prompt requests general activities with ordinary materials, without invented venues, events, opening hours, or live local information. Completion is recorded locally by the user.

Provider credentials remain **backend-only**. They are not embedded in the frontend, included in the demo, or committed to Git. Activity generation sends selected preferences, not the user's diary reflections or screenshot history.

## 5. External Tools & Datasets

| Technology/service | Actual role |
| --- | --- |
| Vue 3 and Vite | Frontend components, reactivity, development server, and production build |
| Axios | API requests with credentials and CSRF headers |
| Lucide (`lucide-vue-next`) | Named SVG icon components |
| Bootstrap | Imported CSS and layout/form utilities, alongside the custom TouchGrass theme |
| Node.js 24 and Express | Backend runtime, routing, validation, and HTTP API |
| Mongoose and MongoDB / MongoDB Atlas | Models and persistence for accounts, groups, check-ins, and server sessions; Atlas is the hosted database service used for the submission |
| `bcryptjs`, `express-session`, `connect-mongo` | Password hashing, cookie sessions, and MongoDB session storage |
| `cors`, `express-rate-limit`, `dotenv` | Origin configuration, selected endpoint rate limits, and backend environment loading |
| Node.js `crypto` | CSRF randomness and signed analysis receipts |
| Node.js test runner and Supertest | Regression checks and HTTP tests using mocked/in-memory dependencies where appropriate |
| APIyi | Third-party pretrained-model access through an OpenAI-compatible endpoint |
| GitHub | Source repository and hosting integration |
| Vercel | Frontend hosting and the same-origin `/api` rewrite |
| Render | Express backend hosting on a Free instance |
| ChatGPT / Codex | Assistance with implementation, interface refinements, tests, debugging, deployment preparation, and documentation |

This submission includes **AI-assisted code and documentation**. Development assistance from ChatGPT/Codex is separate from the runtime AI features described above.

**External datasets:** no external dataset is imported, used for training, or bundled as an evaluation corpus. Real user screenshots are runtime inputs, not a training dataset created by this project. Demo fixtures and test inputs are synthetic/fictional; they are not anonymised real users, measured behaviour, or evidence of real-world impact. The pretrained model's original training data is outside this repository.

No repository-wide `LICENSE` file is currently included, and this README does not assert a project-wide licence grant. Dependencies and external services retain their own licences and terms.

## 6. Installation & Setup

### Prerequisites and repository layout

Use **Node.js 24.x**, npm/npx, Git, and either a local MongoDB instance or a MongoDB Atlas development database. The frontend is pinned to **pnpm 10.34.7**; explicit `npx` commands below work without Corepack or a global pnpm installation. AI features additionally require your own APIyi account/credential and a compatible endpoint/model.

- `client-vue/`: active Vue frontend.
- `server/`: Express API, models, and backend tests.
- `scripts/`: fictional demo generation and hosted smoke-check utilities.
- [AUTHENTICATION.md](AUTHENTICATION.md): session, account-ownership, and eligibility details.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): hosting configuration and operational checks. Its earlier setup-stage status notes are not evidence that every hosted flow has passed.

Clone and install from the repository root:

```sh
git clone https://github.com/kaavya134/touchgrass
cd touchgrass
npm ci --prefix server
npx --yes pnpm@10.34.7 --dir client-vue install --frozen-lockfile
```

Keep the committed lockfiles. Do not regenerate or remove `pnpm-lock.yaml` to bypass an install error, and do not replace the pinned command with an unrelated global pnpm version.

### Local environment files

Copy [server/.env.example](server/.env.example) to `server/.env` and [client-vue/.env.example](client-vue/.env.example) to `client-vue/.env`. **Preserve existing files.** For example, in PowerShell:

```powershell
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (!(Test-Path client-vue/.env)) { Copy-Item client-vue/.env.example client-vue/.env }
```

Configure the backend privately. This is a **safe template**, not a working credential set; replace the example provider address and fill the blank private values before starting:

```dotenv
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/touchgrass_dev
AI_BASE_URL=https://your-apiyi-endpoint.example/v1
AI_MODEL=gpt-4o-mini
AI_API_KEY=
SESSION_SECRET=
FRONTEND_ORIGINS=http://localhost:5173
SESSION_COOKIE_SAME_SITE=lax
SESSION_COOKIE_SECURE=false
TRUST_PROXY_HOPS=
```

- `MONGODB_URI`: connection string for the intended development database. For Atlas, configure its database user and network access appropriately.
- `SESSION_SECRET`: a unique private random value of at least 32 characters; keep it stable between backend restarts/deploys. Generate it locally, keep it private, and never paste it into issues or screenshots:

  ```sh
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`: required for the AI flows. Use the OpenAI-compatible base URL supplied for your APIyi account; the backend appends `/chat/completions`. The `.example` address above is deliberately non-functional. Authentication and non-AI features do not require a successful provider call.
- `FRONTEND_ORIGINS`: exact allowed frontend origins, comma-separated if needed, with no trailing slash or wildcard. Use the frontend's actual port if Vite selects a different one.
- `PORT`, `NODE_ENV`, `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE`, and `TRUST_PROXY_HOPS`: runtime/cookie/proxy settings shown above for direct local HTTP development. Backend port defaults to 8000; leave proxy hops blank locally.

The local frontend needs only a public API address:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

All `VITE_` values can be exposed in browser builds. Never put provider keys, database credentials, or session secrets there. Actual environment files, dependencies, build output, and designated personal upload/screenshot locations are ignored by Git; safe examples and lockfiles remain versioned.

### Start in two terminals

From the repository root, terminal 1:

```sh
npm run dev --prefix server
```

Terminal 2:

```sh
npx --yes pnpm@10.34.7 --dir client-vue run dev
```

Open **http://localhost:5173**. The local API is **http://localhost:8000/api**, with readiness at **http://localhost:8000/api/health**. Use `localhost` consistently rather than mixing it with `127.0.0.1` for browser requests. Sign up for real features, or choose Explore demo without an account.

Use a development database: backend startup initializes indexes and fills missing forward-looking competition eligibility dates. It does not delete existing groups or rewrite historical check-ins, but starting it against an existing database is not a read-only operation.

### Tests and production build

From the root, in PowerShell:

```powershell
$env:AUTH_INTEGRATION='0'
npm test --prefix server
node --test client-vue/src/*.test.mjs
npx --yes pnpm@10.34.7 --dir client-vue run build
```

On a POSIX shell, use `AUTH_INTEGRATION=0 npm test --prefix server` for the backend command. The build writes `client-vue/dist`; production serving uses the hosting settings below. `server` also has `npm start` for its normal Node entry point; `client-vue` has Vite `dev`, `build`, and `preview` scripts.

The optional real MongoDB integration test is documented in [AUTHENTICATION.md](AUTHENTICATION.md). It creates and deletes an isolated test database when explicitly enabled; it is **not part of the default verified checks**. `server/test-screenshot-live.js` is a separate opt-in utility that sends a real image to the provider and may incur cost; it was not used to establish the mocked test results below.

### Production differs from local development

| Setting | Local | Vercel + Render production |
| --- | --- | --- |
| Frontend API address | `VITE_API_BASE_URL=http://localhost:8000/api` | `VITE_API_BASE_URL=/api` |
| Proxy target | Not used | Vercel `RENDER_API_ORIGIN=https://touchgrass-api-7x8m.onrender.com`; also the committed default |
| Allowed origin | `http://localhost:5173` | Render `FRONTEND_ORIGINS=https://touchgrass-beige.vercel.app` |
| Backend runtime | `NODE_ENV=development`, default port 8000 | `NODE_ENV=production`; Render supplies `PORT` |
| Cookies | `lax`, Secure false for local HTTP | `SESSION_COOKIE_SAME_SITE=lax`, `SESSION_COOKIE_SECURE=true`; host-only, HttpOnly |
| Proxy trust | Blank | `TRUST_PROXY_HOPS=1` initially for the immediate Render proxy; verify the real path rather than blindly increasing it |

Vercel uses Root Directory `client-vue`, Vite, Node 24.x, Install Command `npx --yes pnpm@10.34.7 install --frozen-lockfile`, Build Command `npx --yes pnpm@10.34.7 run build`, and output `dist`. Remove `ENABLE_EXPERIMENTAL_COREPACK`; these commands explicitly select pnpm without it. The `/api` rewrite precedes the SPA fallback and disables API caching.

Render uses Root Directory `server`, branch `master`, Build Command `npm ci --omit=dev`, Start Command `npm start`, and health path `/api/health`. Private backend variables belong only on Render. Exact-origin and CSRF protections stay enabled. Do not switch to direct cross-site API calls or disable security checks to work around a deployment error. See the deployment guide for details.

## 7. AI Safety & Limitations

### Accuracy, authenticity, and privacy

- AI can misread text, dates, category values, or screenshot layout. Cropped or ambiguous images can fail extraction; a successful JSON response is not evidence that its contents are true.
- **Screenshot-backed does not mean authenticity verified.** An edited screenshot can look legitimate to the model. This app is an accountability tool, not a tamper-proof device monitor, OS usage integration, or fraud-detection system.
- Clicking Analyse sends the screenshot to the **third-party AI provider**. Avoid unnecessary personal information in images. The application persists extracted check-in data and receipt identifiers rather than saving original image files; provider retention practices are outside this repository's control.
- The model is instructed to ignore instructions embedded in image text and to avoid substituting weekly totals, app limits, or inferred values. These prompt instructions reduce some errors but are not a guarantee against adversarial inputs.

### Validation and ranking boundaries

- The backend validates response structure, real calendar dates, and integer social minutes from **0 to 1,440**. Saving accepts only today/yesterday in Singapore and rechecks the provisional/completed status against the current day.
- The review step requires a user action before saving; the UI does not expose editable ranked usage/date fields. The check-in API rejects arbitrary additional client-supplied date/usage fields and accepts only an account-bound signed analysis receipt.
- Receipts expire after 30 minutes and cannot be replayed to replace a saved entry. Their signing key is process-local, so a restart or another backend instance can invalidate an unsaved analysis; reanalysis may be necessary.
- Today's records **do not automatically become completed tomorrow**. A fresh completed-day screenshot is required. Missing days are never treated as zero; practice and historical records do not become official retroactively.
- Manual diary logs and self-reported activity completion are excluded from leaderboard calculations. A lower total only wins within the implemented eligibility/completeness rules, not as a claim about somebody's overall wellbeing.

### Limits, failures, and access controls

- The browser accepts PNG/JPEG/WebP files up to **5 MiB**. Base64 plus JSON expands a full-sized image to roughly 6.67 MiB. The screenshot API uses a **7 MiB JSON-body limit** and validates the data-URL format; other JSON routes use **16 KiB**. The server's body limit is not independent verification of the image's actual decoded contents or authenticity.
- Provider requests have a **60-second abort deadline**; screenshot/activity clients wait up to **70 seconds**. Errors can result from timeouts, provider configuration, service limits, or insufficient provider credit. Calls may incur charges.
- Activity failures expose labelled built-in suggestions after a generation error, including when rate-limited. These are general ideas, not AI-generated live venue/event recommendations. There is no built-in replacement for a failed screenshot extraction: a ranked check-in still requires valid analysis.
- Login and signup share a **10-attempt/IP/15-minute** limiter. Activity generation allows **five attempts/IP/10 minutes**, with one request in flight per IP. These are in-memory, per-process controls and depend on correct proxy configuration; they are not a distributed quota system.
- The screenshot endpoint requires authentication but has **no dedicated application-level screenshot rate limiter or provider-spend budget**. Upload bounds and disabled repeated-submit UI controls do not replace those missing controls.
- Protected feature APIs require a signed-in session; group reads/check-ins/rankings require membership. User identity comes from the session. Passwords are bcrypt-hashed; session IDs use HttpOnly cookies with Secure enabled in production; mutating requests require CSRF tokens and check any supplied Origin against the exact allowlist.

### Storage and account limitations

- Diary data is scoped to account ID in this browser. Activity sets/completion are scoped to account plus group/member in this browser. Neither is cross-device synced or encrypted by the app; clearing browser data removes it. Local account scoping is not protection against someone with access to the same browser profile/developer tools.
- MongoDB stores accounts, groups, screenshot check-ins, and sessions. Logout clears displayed account state and the server session but leaves account-scoped diary/activity data for that account's next login.
- There is no email verification, password reset, account recovery, password-change, account-deletion, or social-login flow. Knowing another user's display name does not establish account ownership or claim historical memberships.
- Render's Free instance can sleep after inactivity and take time to wake. The first session/AI request may time out; wait for readiness and retry. Availability is not an uptime guarantee.

### What has actually been checked

Status recorded for this README on **18 October 2026**:

| Check | Evidence and boundary |
| --- | --- |
| Backend regression suite | **37 passed, 1 skipped**. Uses mocked provider/database operations and in-memory session/HTTP tests; covers dates, eligibility, totals, ties, receipts, validation, origin/CSRF behavior, size limits, and errors. |
| Frontend checks | **12 passed**. Covers diary helpers, saved activity schema, screenshot handlers/retries, demo server rendering/dependency boundaries, and deployment routing. These are not browser interaction tests. |
| Install/build | Pinned pnpm 10.34.7 clean frozen installation and Vite production build passed during deployment preparation, with the committed lockfile preserved. This does not prove a hosted user journey. |
| Public availability | Website `/` returned **HTTP 200**. Both the frontend's proxied `/api/health` and Render's direct `/api/health` returned **HTTP 200** with `databaseConnected: true`. No account or provider call was needed. |
| Live provider / live MongoDB integration | Not run for this documentation audit. Mocked AI responses do not verify live APIyi extraction. The real MongoDB integration test remained disabled. |
| Browser/device checks | Full 375px/1440px rendered-layout checks, physical-phone file selection, and complete interactive browser journeys remain unverified. Demo markup was server-rendered in tests, not manually verified in a browser. |
| Hosted feature flows | Production signup/login/logout, cookie persistence, group creation/joining, screenshot analysis/save/replacement, and activity generation have **not been established as passing by the availability checks above**. |

The optional `node scripts/check-deployment.mjs https://touchgrass-beige.vercel.app` performs additional hosted proxy, cookie, session, CSRF, and synthetic request-size checks. It creates an anonymous session and consumes one invalid login attempt, but does not create groups/check-ins or call AI. Its existence is not a claim that it or a full browser acceptance test has passed on the deployed site.
