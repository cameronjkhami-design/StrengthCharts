# StrengthCharts — Claude Code Reference

## Project Overview

StrengthCharts is a mobile-first PWA for tracking personal records (PRs) and competing with friends in strength training. It runs as a React SPA with an Express API backend, Turso SQLite database, and deploys to Vercel.

- **Working Directory:** `/Users/cameronkhami/StrengthApp`
- **GitHub:** `https://github.com/cameronjkhami-design/StrengthCharts`
- **Live URL:** `https://strengthcharts.vercel.app`
- **Turso DB:** `libsql://strengthcharts-cameronk.aws-us-east-2.turso.io`
- **Branch:** `main`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Database | Turso (libsql/client) — cloud SQLite |
| Email | Resend (password reset codes) |
| Mobile | Capacitor (iOS/Android wrapper) |
| Monetization | RevenueCat (IAP), AdMob (rewarded ads) |
| Deployment | Vercel (serverless), Turso (DB), Resend (email) |

## Directory Structure

```
server/
  app.js              # Express app setup, middleware, route mounting
  index.js            # Server entry point (local dev, port 3001)
  db.js               # Turso DB init, schema migrations, CREATE TABLE IF NOT EXISTS
  seed.js             # Sample data (3 users, lift logs) — DO NOT run on production
  routes/
    auth.js            # Login, signup, PIN reset, email verification
    lifts.js           # Log/fetch/delete lift records, PRs, batch delete
    bodyweight.js      # Bodyweight tracking CRUD
    leaderboard.js     # Friend leaderboard with relative strength
    friends.js         # Friend request/accept/decline/remove

client/src/
  main.jsx             # React entry, Capacitor native setup
  App.jsx              # Router, layout, PageWrapper for transitions
  index.css            # Global styles, animations, Tailwind layers

  pages/
    Login.jsx          # Login/signup/PIN reset (4 modes)
    Dashboard.jsx      # Home with PR cards, tier badges, overlay chart
    LogPR.jsx          # PR logging form with weight suggestion, RPE
    MyLifts.jsx        # Exercise history, charts, delete lift/category
    Leaderboard.jsx    # Rankings by lift or overall (absolute/relative)
    Overview.jsx       # Pro-gated stats: volume chart, strength profile, rankings
    Profile.jsx        # Settings, bodyweight, achievements, friends, showcase badges

  components/
    BottomNav.jsx      # 6-tab nav: Home, Log PR, My Lifts, Overview, Ranks, Profile
    TierBadge.jsx      # Tier pill component (Untrained → World Class)
    ProgressBar.jsx    # Linear progress indicator
    PremiumGate.jsx    # Feature gating wrapper + ProTag component
    LiftChart.jsx      # Recharts line chart for lift progression
    StrengthRatioChart.jsx  # BW-relative strength trend chart
    ProUpgradeModal.jsx     # In-app purchase UI

  context/
    AuthContext.jsx    # User state + localStorage (key: sc_user)
    PremiumContext.jsx # Premium gating (currently ALL features unlocked via hasAccess() → true)
    NotificationContext.jsx # Toast notifications, dynamic island safe area

  hooks/
    usePurchases.js    # RevenueCat in-app purchase logic
    useAds.js          # AdMob rewarded ad integration

  utils/
    api.js             # Fetch wrapper for all backend endpoints
    benchmarks.js      # Tier thresholds, percentile calc, E1RM formula, exercise list
    achievements.js    # 20+ achievements across 4 categories
    conversions.js     # kg↔lbs conversion, formatWeight() rounds to whole numbers
    colors.js          # Primary color #FFD700 (gold)

api/
  index.js             # Exports Express app for Vercel serverless

vercel.json            # Routes: /api/* → api/index.js, SPA fallback → /index.html
```

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,               -- SHA256 hashed 6-digit PIN
  display_name TEXT,
  email TEXT,
  unit_pref TEXT DEFAULT 'lbs',         -- 'lbs' or 'kg'
  is_premium INTEGER DEFAULT 0,
  premium_purchased_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,                  -- SHA256 hashed 6-digit code
  expires_at DATETIME NOT NULL,         -- 15-min expiry
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lift_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg REAL NOT NULL,              -- Always stored in kg
  reps INTEGER NOT NULL,
  rpe REAL,                             -- Rate of Perceived Exertion (0-10)
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE bodyweight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',        -- 'pending' or 'accepted'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);
```

## API Endpoints

### Auth (`/api/auth`)
- `POST /signup` — Create user (username, pin, display_name, email)
- `POST /login` — Authenticate (username, pin) → returns user object
- `PUT /user/:id` — Update display_name, unit_pref, or is_premium
- `PUT /user/:id/premium` — Set premium status
- `POST /forgot-pin` — Send 6-digit reset code via Resend email
- `POST /reset-pin` — Verify code and set new PIN

### Lifts (`/api/lifts`)
- `GET /:userId` — All logs (newest first)
- `GET /:userId/exercises` — Unique exercise names
- `GET /:userId/exercise/:name` — Logs for specific exercise
- `GET /:userId/prs` — Best E1RM per exercise (Epley: weight × (1 + reps/30))
- `POST /` — Log lift (exercise_name, weight_kg, reps, rpe?, notes?, logged_at?)
- `DELETE /:id` — Delete single log
- `DELETE /:userId/exercise/:name` — Delete all logs for an exercise

### Bodyweight (`/api/bodyweight`)
- `GET /:userId` — All logs (newest first)
- `GET /:userId/latest` — Most recent entry
- `POST /` — Log bodyweight
- `DELETE /:id` — Delete entry

### Leaderboard (`/api/leaderboard`)
- `GET /?userId=X` — Rankings with BW-relative strength scores (filters to friends if userId provided)

### Friends (`/api/friends`)
- `GET /search?userId=X&q=term` — Search users, returns friend_status
- `GET /:userId` — List accepted friends
- `GET /:userId/pending` — Incoming pending requests
- `POST /` — Send request (auto-accepts mutual)
- `PUT /accept` — Accept request
- `PUT /decline` — Decline/cancel request
- `DELETE /` — Remove friend

## Key Patterns & Conventions

### Database Access
```javascript
// Always use @libsql/client async pattern:
const result = await db.execute({ sql: '...', args: [...] });
// result.rows is an array of row objects
```

### Weight Storage
- All weights stored in **kg** in the database
- Converted to user's preferred unit (lbs/kg) on display via `conversions.js`
- `formatWeight()` and `kgToDisplay()` round to whole numbers

### Strength Calculations
- **E1RM** (Estimated 1-Rep Max): `weight × (1 + reps / 30)` (Epley formula)
- **Tier System**: 6 tiers based on BW-relative ratios (E1RM ÷ bodyweight)
  - Untrained → Beginner → Intermediate → Advanced → Elite → World Class
- **Percentile**: 1-99 based on where user falls within tier boundaries
- Tier thresholds defined per exercise in `benchmarks.js`

### Supported Exercises
Squat, Bench Press, Deadlift, Overhead Press, Barbell Row, Pull-ups, Incline DB Press, Pendulum Squat, Hack Squat

### Premium Features
All pro features are currently **unlocked** — `PremiumContext.hasAccess()` always returns `true`. PRO tags are still displayed next to gated features. Premium features include:
- Friend leaderboard, overlay charts, BW ratio trends, bodyweight trendline, achievements page, export data

### Authentication
- PIN-based (6-digit codes, SHA256 hashed)
- No passwords — PINs only
- Reset via email with 6-digit code (15-min expiry, sent via Resend)

### Styling
- Tailwind CSS with custom dark theme
- Primary color: `#FFD700` (gold)
- Dark palette: `#0a0a0a` (900) → `#3a3a3a` (500)
- Fonts: Barlow Condensed (headings), Inter (body)
- Mobile-first with `overflow-x-hidden` on all pages
- `env(safe-area-inset-top)` for iPhone dynamic island

### Page Transitions
- CSS `@keyframes page-fade-in` with React key-based remounting via `PageWrapper` in App.jsx

### Bottom Navigation (6 tabs)
Home | Log PR | My Lifts | Overview | Ranks | Profile

## Development

```bash
# Local dev (runs both server on :3001 and client on :5173)
npm run dev

# Build client
cd client && npm run build

# Seed database (local/dev only — DO NOT run on production)
node server/seed.js
```

### Vercel Deployment
- Auto-deploys from `main` branch via GitHub integration
- `api/index.js` wraps Express app as Vercel serverless function
- **Required env vars on Vercel:**
  - `TURSO_DATABASE_URL` — Turso connection string
  - `TURSO_AUTH_TOKEN` — Turso auth token
  - `RESEND_API_KEY` — Resend API key (for password reset emails)

### Vite Dev Proxy
Client proxies `/api` requests to `http://localhost:3001` during development (configured in `client/vite.config.js`).

## Important Rules

1. **DO NOT reseed production database** — user accounts persist via `CREATE TABLE IF NOT EXISTS`
2. All seed users have PIN `123456`
3. Weights are always stored in kg — convert on display only
4. The `rpe` column was added via ALTER TABLE migration in `db.js` — it may not exist in older databases
5. Friendships are bidirectional — two rows per friendship (one per direction)
6. Keep `overflow-x-hidden` on all page containers to prevent mobile horizontal scroll
7. Bottom nav has 6 tabs — text is `text-[9px]` to fit; "Dashboard" was renamed to "Home"
