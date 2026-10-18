# TouchGrass

A small-group social screen-time tracker with screenshot check-ins, weekly rankings, offline activity suggestions, and a personal usage diary. Built with Vue 3, Vite, Express, and MongoDB.

## Project layout

- `client-vue/`: active Vue frontend, including Lucide icons and the TouchGrass theme.
- `server/`: authenticated API, MongoDB models, screenshot analysis, and tests.
- [AUTHENTICATION.md](AUTHENTICATION.md): account ownership, sessions, competition eligibility, and hosted configuration details.

## Local setup

Use Node.js 24 LTS and npm, plus a running MongoDB instance. AI features need an OpenAI-compatible provider with image input and JSON responses. No credentials are included.

From the repository root (PowerShell):

```powershell
npm ci --prefix server
npm ci --prefix client-vue
Copy-Item server/.env.example server/.env
Copy-Item client-vue/.env.example client-vue/.env
```

Copy the examples only when the destination files do not already exist. Configure `server/.env` with your MongoDB URI, provider URL/model/API key, and a unique `SESSION_SECRET` of at least 32 random characters. Generate the secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value private. The frontend API URL defaults to `http://localhost:8000/api`; `VITE_` settings are public and must never contain secrets.

Run in separate terminals:

```powershell
npm run dev --prefix server
npm run dev --prefix client-vue
```

Open `http://localhost:5173` and sign up. Use `localhost` consistently so cookies work. Backend defaults to port 8000; if Vite chooses another port, update `FRONTEND_ORIGINS` to match it. Use a development database: server startup initializes indexes and assigns future competition eligibility dates where missing. It preserves existing check-ins and does not delete groups.

Both npm and pnpm lockfiles are included. Use one package manager consistently and synchronize lockfiles when changing dependencies.

## Checks

```powershell
npm test --prefix server
node --test client-vue/src/personal-tools.test.mjs client-vue/src/screenshot-flow.test.mjs
npm run build --prefix client-vue
```

The default server tests use mocked providers/database operations. Keep `AUTH_INTEGRATION` unset: its opt-in test connects to MongoDB, creates an isolated test database, and deletes that test database. Do not run `server/test-screenshot-live.js` unless you intend to send a real image to the configured AI provider. See [frontend notes](client-vue/README.md) for pending visual checks.

## Current limitations

- Accounts have no email verification, password reset, account recovery, or account deletion flow. Sessions require MongoDB; rate limits are per backend process.
- Screenshot analysis sends the image to the configured AI provider only on explicit analysis. Extraction can fail or be inaccurate and does not prove authenticity. Check-ins accept today/yesterday in Asia/Singapore; today is provisional. Practice and missing days do not count as completed official days.
- Diary entries and activity suggestions/completions are account-scoped browser storage, unsynced and unencrypted. Clearing browser data removes them. Diary and self-reported activity completion never affect rankings.
- AI suggestions can fail; labelled built-in activities are available after a generation error. Provider usage may incur charges.
- Rendered 375px/1440px and physical-phone file-picker checks remain pending. Hosted HTTPS, cookie/proxy behavior, and production deployment have not been verified. Nothing is deployed.

## Repository hygiene

Local `.env` files, credentials, dependencies, builds, logs, database backups, uploads, and personal screenshot folders/names are ignored. Safe `.env.example` files and dependency lockfiles are committed. Keep personal images in ignored `screenshots/` or `uploads/`, never among source assets. Review staged changes before publishing; ignore rules do not remove secrets already committed in history.
