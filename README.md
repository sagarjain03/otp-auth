# OTP Auth

Passwordless login and signup with a one-time code sent by email. There are no passwords anywhere: you enter your email, receive a 6-digit code, enter it, and you're in. The same flow creates an account the first time.

**Live demo:** `https://<your-app>.vercel.app` _(placeholder)_
**API:** `https://<your-api>.onrender.com/api/health` _(placeholder)_

> The API runs on Render's free tier and sleeps when idle. The **first request can take about 50 seconds**. If the login page loads slowly, wait a moment and try again.

---

## Tech stack

| Part | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Atlas or local) with Mongoose |
| Auth | JWT in an httpOnly cookie, OTP hashed with bcrypt (`bcryptjs`) |
| Email | Gmail SMTP via Nodemailer (local dev) or Brevo HTTP API (production) |
| Security | `helmet`, `express-rate-limit`, input validation, central error handler |

## Architecture

```
Browser ──> Next.js (client/, :3000) ──rewrite /api/*──> Express (server/, :5000) ──> MongoDB
```

- The browser only ever talks to the Next.js app. `client/next.config.mjs` **rewrites** every `/api/*` request to Express (`API_URL`, default `http://localhost:5000`).
- So all requests are **same-origin**: there's no CORS setup, and the login cookie works without any cross-site cookie settings.
- Express stores users and OTPs in MongoDB. MongoDB deletes expired OTPs automatically (TTL index).

```
otp-auth/
├── client/                  Next.js frontend
│   ├── app/                 pages: login, verify, complete-profile, dashboard
│   ├── components/ui.js     shared UI (Card, Input, Button, ErrorMessage)
│   └── lib/                 api.js (fetch helper), useAuth.js (route protection)
├── server/                  Express API
│   ├── config/env.js        env variable checks at startup
│   ├── controllers/         auth logic
│   ├── middleware/          requireAuth, rate limits, error handler
│   ├── models/              User, Otp
│   ├── routes/              /api/auth routes
│   └── utils/               sendEmail, email normalize/validate, cookie options
└── package.json             runs both apps with one command
```

### Login flow

1. User enters an email → `POST /api/auth/send-otp`. The server creates a 6-digit code with `crypto.randomInt`, stores only its **bcrypt hash** with a 5-minute expiry, and emails the code.
2. User enters the code → `POST /api/auth/verify-otp`. If it matches, the OTP is deleted, the user is created (signup) or `lastLoginAt` is updated (login), and a 7-day JWT is set as an httpOnly cookie.
3. If the user has no name yet, the frontend sends them to `/complete-profile`. Otherwise it sends them to `/dashboard`.

---

## Run it locally

**You need:** Node.js 20+, and a MongoDB database. A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or local MongoDB both work.

```bash
git clone <this-repo-url>
cd otp-auth

npm install            # root: installs concurrently
npm install --prefix server
npm install --prefix client
```

Create `server/.env` by copying `server/.env.example`, then fill it in ([env variables](#environment-variables) below):

```bash
cp server/.env.example server/.env      # PowerShell: Copy-Item server/.env.example server/.env
```

Start both apps:

```bash
npm run dev
```

Open http://localhost:3000. In the terminal you should see:

```
[server] MongoDB connected
[server] Server running on http://localhost:5000
```

In development (`NODE_ENV` is not `production`) the OTP is also printed in the terminal (`[dev] OTP for ...`), so you can test even before email works.

If an env variable is missing or wrong, the server stops at startup and lists exactly what to fix.

---

## Environment variables

### `server/.env`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | no | `5000` | Defaults to 5000. Render sets it automatically. |
| `MONGO_URI` | yes | `mongodb+srv://user:pass@cluster.mongodb.net/otp-auth` | Local: `mongodb://127.0.0.1:27017/otp-auth` |
| `NODE_ENV` | no | `development` | `production` turns on secure cookies and stops OTPs being logged. |
| `JWT_SECRET` | yes | 64 random hex characters | At least 32 characters. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `EMAIL_PROVIDER` | yes | `gmail` | `gmail` (local) or `brevo` (production). |
| `EMAIL_USER` | if gmail | `you@gmail.com` | The Gmail address that sends the codes. |
| `EMAIL_PASS` | if gmail | `abcdabcdabcdabcd` | A Gmail **App Password** (see below), not your normal password. |
| `BREVO_API_KEY` | if brevo | `xkeysib-...` | Brevo → SMTP & API → API Keys. |
| `EMAIL_FROM` | if brevo | `you@gmail.com` | Must be a **verified sender** in Brevo. |
| `TRUST_PROXY` | no | `1` | How many proxies sit in front of Express. Leave empty locally. See [Security decisions](#security-decisions). |

### Client (only for deployment)

| Variable | Where | Example | Notes |
|---|---|---|---|
| `API_URL` | Vercel | `https://your-api.onrender.com` | Where `/api/*` is rewritten to. No trailing slash. Defaults to `http://localhost:5000`. |

### Getting a Gmail App Password

1. Open your Google Account → **Security**.
2. Turn on **2-Step Verification**. App Passwords only exist when it's on.
3. Go to https://myaccount.google.com/apppasswords (or search "App passwords" in your Google Account).
4. Create one named e.g. `otp-auth`. Google shows a 16-character password once.
5. Put it in `EMAIL_PASS` without spaces, and your Gmail address in `EMAIL_USER`.

---

## API endpoints

All responses are JSON. Errors always look like `{ "message": "..." }`.

| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/health` | – | – | `{ ok: true }` | – |
| POST | `/api/auth/send-otp` | – | `{ email }` | `{ message }` | 400 invalid email · 429 resend cooldown, locked email, or rate limit |
| POST | `/api/auth/verify-otp` | – | `{ email, otp }` | `{ user, isNewUser }` + sets `token` cookie | 400 invalid or expired OTP · 429 locked or rate limit |
| GET | `/api/auth/me` | cookie | – | `{ user }` | 401 not logged in |
| PATCH | `/api/auth/profile` | cookie | `{ name }` | `{ user }` | 400 name not 1–50 characters · 401 |
| POST | `/api/auth/logout` | – | – | `{ message }`, clears cookie | – |

Other errors: unknown route → 404, invalid JSON → 400, body over 10 KB → 413, unexpected server error → 500 with a generic message.

---

## Security decisions

- **The OTP is stored hashed (bcrypt), never as plain text.** If the database leaks, the attacker gets hashes, not working codes. The plain code exists only in the email (and in the dev terminal, never in production).
- **Secure random codes.** `crypto.randomInt` is cryptographically secure. `Math.random` is predictable and is not used.
- **Session in an httpOnly cookie, not localStorage.** JavaScript in the page can't read an httpOnly cookie, so an XSS bug can't steal the session token. Cookie settings:
  - `sameSite: "lax"`: the cookie isn't sent on cross-site POSTs, which protects against CSRF.
  - `secure` in production: the cookie is sent over HTTPS only.
  - Lifetime: 7 days, the same as the JWT.
- **Short expiry.** Each OTP is valid for 5 minutes. The server checks expiry itself, and a MongoDB TTL index also deletes old OTPs. Only one OTP per email is active at a time, and a new one replaces the old one.
- **Attempt lock.** After 5 wrong codes the OTP is **locked, not deleted**, until it expires. While locked:
  - Verify returns 429, even for the correct code.
  - Requesting a new code also returns 429.

  This caps guessing at 5 tries per 5 minutes per email. Each attempt is counted with one atomic database update *before* the code is compared, so parallel requests can't get more than 5 guesses.
- **One-time use.** A correct code is consumed with one atomic `findOneAndDelete`, and only the request that actually deleted it gets logged in. The same code can't be used twice, even by two requests at the same moment.
- **Same message for every OTP failure.** No OTP, expired OTP, and wrong OTP all return `Invalid or expired OTP`, so an attacker can't tell which one happened.
- **Resend cooldown.** 60 seconds between codes for the same email.
- **Rate limits** (`express-rate-limit`):

  | Limit | Applies to | Counts |
  |---|---|---|
  | 10 per 15 min | send-otp, per IP | every request |
  | 20 per 15 min | verify-otp, per IP | every request |
  | 5 per hour | send-otp, per **email** | only codes actually sent |

  The per-email limit protects someone's inbox even if an attacker switches IPs. Emails are normalized (trim + lowercase) before counting, so `A@B.com` and `a@b.com` share a limit.
- **The trust proxy finding.** Requests reach Express through a proxy (the Next.js rewrite, and in production Vercel and Render), so the client IP has to come from the `X-Forwarded-For` header. I tested what Express actually receives locally:
  - The Next.js rewrite **does not add** `X-Forwarded-For`. It forwards whatever the client sent.
  - With `trust proxy` turned on, anyone could send a fake `X-Forwarded-For` and get a fresh IP limit on every request.

  So `trust proxy` defaults to **0**: Express uses the direct connection's IP. Locally all requests then look like one IP, which is fine for development. In production, `TRUST_PROXY` is set to the number of proxies measured on the deployed app. Even then, someone calling the Render URL directly can fake the header, which is why the per-email limit exists as a second layer.
- **Input validation.**
  - Emails are trimmed, lowercased, checked against a format, and limited to 254 characters, all in one shared helper (`server/utils/email.js`).
  - The OTP must be exactly 6 digits. Names must be 1–50 characters.
  - Every input is turned into a string first, so objects like `{"$gt": ""}` can't be injected into MongoDB queries.
  - JSON bodies are limited to 10 KB.
- **Env validation at startup.** The server refuses to start, with a clear list of problems, if `MONGO_URI` or `JWT_SECRET` (min 32 characters) is missing, `EMAIL_PROVIDER` isn't `gmail`/`brevo`, or the chosen provider's keys are missing. A typo is found at startup instead of failing on the first login.
- **No internal details in responses.** A central error handler logs full errors on the server and sends the client only a safe message. There are no stack traces in responses. `helmet` adds security headers and hides `X-Powered-By`.
- **Route protection on the frontend.** `/dashboard` and `/complete-profile` ask the server (`GET /api/auth/me`) each time they're shown, including after the browser Back button. The real protection is the server: every protected API route checks the JWT.

---

## Known limitations

- **Rate limits are kept in memory.**
  - They reset when the server restarts.
  - They aren't shared between several server instances.
  - To run more than one instance, use a shared store such as Redis (`rate-limit-redis`).
- **Gmail aliases get around the per-email limit.** `name+1@gmail.com`, `name+2@gmail.com` and `n.a.m.e@gmail.com` all reach the same inbox but count as different emails, so one inbox can get more than 5 codes an hour. A fix would strip `+tags` and dots for Gmail addresses when counting. The per-IP limit still applies.
- **The client IP can be faked when calling the API directly.** Someone who skips the frontend and calls the Render URL with a fake `X-Forwarded-For` can avoid the per-IP limit. The per-email limit and the attempt lock still apply.
- **Logout doesn't cancel the token.** Logout clears the cookie, but a JWT copied before logout stays valid until it expires (7 days). Cancelling tokens early would need a server-side session list or a token version stored on the user.
- **Render cold start.** The free tier sleeps after about 15 minutes idle. The first request after that takes about 50 seconds.
- **No delivery feedback.** If an email bounces (e.g. a full inbox), the API has already said "sent". Bounces arrive later and the API can't see them.

---

## Deployment

The server goes on **Render** (root directory `server/`) and the client on **Vercel** (root directory `client/`).

- In production use `EMAIL_PROVIDER=brevo`. Render's free tier blocks SMTP ports, so Gmail SMTP won't work there.
- On Vercel, set `API_URL` to the Render URL **before** building. The rewrite is fixed at build time, and it keeps the cookie on the Vercel domain (same-origin).
- Atlas → Network Access must allow `0.0.0.0/0`, because Render's free tier has no fixed IP.
- Open the API URL once before sharing the demo link, so the server is awake.
