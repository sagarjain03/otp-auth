# OTP Auth – Selection Task

## Requirement (from evaluator)
- **Only OTP-based login/signup** (passwordless). No passwords anywhere.
- Stack: **Next.js (frontend), Express (backend), MongoDB**.
- OTP delivered via **email** (Gmail SMTP through Nodemailer).
- Evaluator (GitHub: `Manavrastogi03`) is a collaborator on this repo.

## How to work in this repo
- Build **one phase at a time**. Do not start the next phase until the current phase's checks pass.
- After each phase: explain every design decision in plain language, then stop so I can test and commit.
- **Never run any git commands** (no init, add, commit, push, branch, stash, reset). I handle git myself.
- Never commit `.env`. Keep `.env.example` updated with every variable used.
- Keep code simple and readable; I must be able to explain all of it in an interview.

## Architecture
```
otp-auth/
├── client/   # Next.js (App Router)
├── server/   # Express API
└── README.md
```
- Next.js proxies `/api/*` to Express using `rewrites` in `next.config.js`, so browser requests are same-origin (no CORS / cross-site cookie problems).
- Session = JWT stored in an **httpOnly** cookie (not localStorage).

## Data models (MongoDB / Mongoose)
**User**: `email` (unique, lowercase, trimmed), `name` (optional), `createdAt`, `lastLoginAt`
**Otp**: `email`, `otpHash`, `expiresAt` (TTL index so Mongo auto-deletes), `attempts` (default 0), `lastSentAt`

## Auth flow (one flow handles both login and signup)
1. User enters email → `POST /api/auth/send-otp`
2. Server generates 6-digit OTP with `crypto.randomInt`, stores **bcrypt hash** + 5-min expiry, emails the plain OTP.
3. User enters OTP → `POST /api/auth/verify-otp`
4. Server checks: OTP exists, not expired, attempts < 5, hash matches. On success: delete OTP, create user if new (signup) or update `lastLoginAt` (login), set JWT cookie.
5. Response says `isNewUser` so frontend can ask for name once.

---

## Phase 1 – Project setup
- Create `client/` (Next.js) and `server/` (Express) folders.
- Server: `express`, `mongoose`, `dotenv`, `cookie-parser`, `nodemon` (dev).
- Connect to MongoDB (Atlas or local) using `MONGO_URI`.
- `GET /api/health` returns `{ ok: true }`.
- Add `.gitignore` (node_modules, .env, .next) and `.env.example`.

**Done when:** `npm run dev` starts both apps, health route works, DB connected log appears, `.env` is not tracked by git.

## Phase 2 – Models + Send OTP
- Create `User` and `Otp` models (fields above, TTL index on `expiresAt`).
- Email util `sendEmail(to, subject, html)` with a swappable provider (`EMAIL_PROVIDER` env):
  - `gmail` – Nodemailer + Gmail **App Password** (`EMAIL_USER`, `EMAIL_PASS`) for local dev.
  - `brevo` – Brevo HTTP API (`BREVO_API_KEY`, `EMAIL_FROM`) for production, because Render's free tier blocks outbound SMTP ports (25/465/587).
- `POST /api/auth/send-otp`:
  - Validate email format.
  - Resend cooldown: reject if `lastSentAt` < 60 seconds ago.
  - Replace any existing OTP for that email (only one active OTP per email).
  - Store hashed OTP, send email.
- In development, also `console.log` the OTP (only when `NODE_ENV !== 'production'`).

**Done when:** OTP arrives in Gmail, DB shows only a hash (never plain OTP), second request within 60s is rejected.

## Phase 3 – Verify OTP + session
- `POST /api/auth/verify-otp`: checks listed in Auth flow step 4.
- Wrong OTP increments `attempts`; at 5 attempts delete the OTP and force a new one.
- On success: sign JWT (`JWT_SECRET`, 7-day expiry), set cookie `httpOnly`, `sameSite: 'lax'`, `secure` in production.
- Auth middleware that reads the cookie and attaches `req.user`.
- `GET /api/auth/me` (protected) → current user.
- `PATCH /api/auth/profile` (protected) → set `name` for new users.
- `POST /api/auth/logout` → clears cookie.

**Done when:** correct OTP logs in; wrong OTP, expired OTP, and reused OTP all fail; `/me` fails without cookie.

## Phase 4 – Frontend
- Next.js rewrites `/api/*` → Express.
- Pages:
  - `/login` – email input → send OTP
  - `/verify` – 6-digit OTP input, resend button with 60s countdown, error messages
  - `/complete-profile` – name input (only if `isNewUser`)
  - `/dashboard` – shows user email/name, logout button
- Protect `/dashboard` and `/complete-profile` (redirect to `/login` if `/api/auth/me` fails); redirect logged-in users away from `/login`.
- Loading and error states on every button.

**Done when:** full flow works in browser end to end for both a new and an existing email.

## Phase 5 – Hardening
- `express-rate-limit` on `/api/auth/*` (e.g. per-IP limits on send-otp and verify-otp).
- `helmet` for security headers.
- Input validation on every route (email format, OTP = exactly 6 digits).
- Central error handler; never leak stack traces or reveal internal details in responses.
- Normalize email (lowercase + trim) everywhere.

**Done when:** spamming send-otp gets blocked, invalid inputs return clean 400 errors.

## Phase 6 – README + final check
- README: what it does, tech stack, setup steps, env variables, how to get a Gmail App Password, API endpoints, and a **"Security decisions"** section (why OTP is hashed, why httpOnly cookie, why expiry/attempt limits/cooldown/rate limiting).
- Fresh clone into a new folder, follow README, confirm everything runs.
- Optional: deploy client on Vercel and server on Render, add live link to README.
  - On Vercel, set the rewrite destination from an env var (`API_URL` = Render URL) so cookies stay same-origin.
  - Use `EMAIL_PROVIDER=brevo` on Render (SMTP is blocked on free tier).
  - Render free tier sleeps when idle; first request can take ~50s. Mention this in README and open the API once before sharing the link.

**Done when:** a stranger could run the project using only the README.