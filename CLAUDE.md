# StrengthCharts — Claude Code Reference

## Project Overview

StrengthCharts is a mobile-first PWA for tracking personal records (PRs) and competing with friends in strength training. It runs as a React SPA with an Express API backend, Turso SQLite database, and deploys to Vercel. Native iOS/Android builds via Capacitor.

- **Working Directory:** `/Users/cameronkhami/StrengthApp`
- **GitHub:** `https://github.com/cameronjkhami-design/StrengthCharts`
- **Live URL:** `https://strength-charts.vercel.app`
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
| Monetization | RevenueCat (IAP), AdMob (rewarded ads for 24hr feature unlock) |
| Deployment | Vercel (serverless), Turso (DB), Resend (email) |

## Directory Structure

```
server/
  app.js              # Express app setup, middleware, route mounting
  index.js            # Server entry point (local dev, port 3001)
  db.js               # Turso DB init, schema migrations, CREATE TABLE IF NOT EXISTS
  seed.js             # Sample data (3 users, lift logs) — DO NOT run on production
  routes/
    auth.js            # Login, signup, PIN reset, email verification, delete account
    lifts.js           # Log/fetch/delete lift records, PRs, batch delete
    bodyweight.js      # Bodyweight tracking CRUD
    leaderboard.js     # Friend leaderboard with relative strength
    friends.js         # Friend request/accept/decline/remove, public profiles w/ privacy

client/src/
  main.jsx             # React entry, Capacitor native setup
  App.jsx              # Router, layout, PageWrapper for transitions
  index.css            # Global styles, animations, Tailwind layers

  pages/
    Login.jsx          # Login/signup/PIN reset (4 modes)
    Dashboard.jsx      # Home with PR cards, tier badges, consistency tracker
    LogPR.jsx          # PR logging form with weight suggestion, RPE, session tracker, WorkoutSummary
    MyLifts.jsx        # Exercise history, charts, delete lift/category
    Overview.jsx       # Pro-gated stats: volume chart, strength profile, rankings, strength legend
    Friends.jsx        # Friend search, requests, leaderboard (embedded sub-tab)
    FriendProfile.jsx  # View friend's public profile (respects privacy settings)
    Profile.jsx        # Achievements, bodyweight, profile photo, showcase badges
    Settings.jsx       # Display name, privacy, haptics, theme color, weight unit, sex
    PlateCalculator.jsx # Barbell plate calculator with IPA/IPF color standards
    Challenges.jsx     # Daily/weekly/monthly/friend challenges with progress tracking
    Leaderboard.jsx    # (Legacy — now embedded in Friends page)

  components/
    BottomNav.jsx      # 6-tab nav: Home, Log Lift, My Lifts, Overview, Friends, Profile
    WorkoutSummary.jsx # Post-workout summary: stats, body map, volume comparisons
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
    usePurchases.js    # RevenueCat in-app purchase + restore logic (native only)
    useAds.js          # AdMob rewarded ad integration (24hr feature unlock)

  utils/
    api.js             # Fetch wrapper — native: https://strength-charts.vercel.app/api, web: /api
    benchmarks.js      # Tier thresholds, percentile calc, E1RM formula, 30+ exercises
    achievements.js    # 20+ achievements across 4 categories, sex-dependent rarity
    conversions.js     # kg↔lbs conversion, formatWeight() rounds to whole numbers
    colors.js          # 8 theme colors with CSS variable injection (--color-primary)
    tips.js            # Exercise-specific training tips by skill level, daily rotation

api/
  index.js             # Exports Express app for Vercel serverless

vercel.json            # Routes: /api/* → api/index.js, SPA fallback → /index.html
```

## App Routes

```
/login              — Public, unauthenticated
/                   — Dashboard (home)
/log                — Log lift form + session tracker
/lifts              — Exercise history
/overview           — Pro analytics (currently unlocked)
/friends            — Friends + leaderboard sub-tab
/friends/:friendId  — Friend profile detail
/profile            — User profile + achievements
/settings           — Settings page
/plate-calculator   — Barbell plate calculator
/challenges         — Challenge tracker
```

## Bottom Navigation (6 tabs)

Home | Log Lift | My Lifts | Overview | Friends | Profile

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  privacy_settings TEXT DEFAULT '{}',   -- JSON: show_prs, show_lifts, show_bodyweight, show_achievements
  theme_color TEXT DEFAULT '#FFD700',   -- User's selected theme color
  sex TEXT,                             -- 'male' or 'female' (for achievement rarity & strength standards)
  profile_photo TEXT,                   -- Base64 image data
  showcase_badges TEXT DEFAULT '[]'     -- JSON array of achievement IDs to display
);

CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,                  -- SHA256 hashed 6-digit code
  expires_at DATETIME NOT NULL,         -- 15-min expiry
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE lift_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg REAL NOT NULL,              -- Always stored in kg
  reps INTEGER NOT NULL,
  rpe REAL,                             -- Rate of Perceived Exertion (0-10)
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE bodyweight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',        -- 'pending' or 'accepted'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id),
  UNIQUE(user_id, friend_id)
);
```

## API Endpoints

### Auth (`/api/auth`)
- `POST /signup` — Create user (username, pin, display_name, email)
- `POST /login` — Authenticate (username, pin) → returns user object
- `PUT /user/:id` — Update display_name, unit_pref, privacy_settings, theme_color, sex, profile_photo, showcase_badges
- `PUT /user/:id/premium` — Set premium status
- `POST /forgot-pin` — Send 6-digit reset code via Resend email
- `POST /reset-pin` — Verify code and set new PIN
- `DELETE /user/:id` — Delete account and all data (requires PIN confirmation)

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
- `GET /:userId/profile/:friendId` — Friend's public profile (respects privacy_settings)
- `POST /` — Send request (auto-accepts mutual)
- `PUT /accept` — Accept request
- `PUT /decline` — Decline/cancel request
- `DELETE /` — Remove friend (bidirectional)

## Key Features

### Workout Session Tracking
- Lifts logged in a session are tracked via `sessionStorage` (key: `sc_session_logs`)
- "Finish Workout" button triggers WorkoutSummary modal
- WorkoutSummary shows: duration/volume/sets stats, body map with activated muscles, fun volume comparisons ("That's like lifting a motorcycle!"), set-by-set details

### Plate Calculator
- Enter target weight → see plates needed per side
- Visual barbell with color-coded plates (IPA standard for lbs, IPF for kg)
- Quick presets (135–495 lbs or equivalent kg)
- Respects user's unit preference

### Challenges
- **Daily**: Log a Lift, Go Heavy, Mix It Up
- **Weekly**: Consistency King, Volume Week, PR Chaser
- **Monthly**: Iron Warrior, Tonnage Titan (with progress bars)
- **Friend**: Volume War (social competition)
- Real-time progress tracking from lift data

### Achievements
- 20+ achievements across 4 categories: milestones, tier-based, volume-based, social
- Sex-dependent rarity (female lifters get higher rarity for same weight thresholds)
- Showcase badges on profile (user selects favorites)

### Training Tips
- Exercise-specific tips filtered by skill level (beginner → advanced)
- Seeded daily rotation for consistency
- Displayed on Profile page (pro-gated)

### Profile Photo
- File picker with compression
- Canvas-based crop tool (drag + pinch zoom)
- Base64 storage in localStorage + database

### Privacy Controls
- Per-user toggles: show_prs, show_lifts, show_bodyweight, show_achievements
- Enforced server-side on friend profile endpoint
- Configurable in Settings page

### Theme Colors
- 8 selectable colors: Gold, Blue, Red, Green, Purple, Orange, Pink, Cyan
- CSS variable injection (`--color-primary`)
- Persisted per user in database

## Key Patterns & Conventions

### Database Access
```javascript
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

### Supported Exercises (30+)
Main lifts: Squat, Bench Press, Deadlift, Overhead Press, Barbell Row
Additional: Pull-ups, Incline DB Press, Pendulum Squat, Hack Squat, and many more defined in `benchmarks.js` `DEFAULT_EXERCISES`

### Premium / Monetization
- Pro features are **gated** — `PremiumContext.hasAccess()` checks `isPremium` and ad-unlocked features
- **Pricing**: $2.99/month, $24.99/year, $69.99 lifetime (displayed in `ProUpgradeModal`)
- **PremiumGate** component shows "Unlock with Pro" + "Watch Ad — Unlock 24hrs" buttons on gated features
- **RevenueCat** handles IAP for Pro upgrade (native only, entitlement: `'pro'`)
- **AdMob** rewarded ads unlock individual features for 24 hours (native only, stored in `localStorage` key `sc_unlocked`)
- Premium features: friend leaderboard, overlay charts, BW ratio trends, bodyweight trendline, achievements, export data, training tips

### Authentication
- PIN-based (6-digit codes, SHA256 hashed)
- No passwords — PINs only
- Reset via email with 6-digit code (15-min expiry, sent via Resend)

### Styling
- Tailwind CSS with light/dark theme support via CSS variables
- Default primary color: `#FFD700` (gold), user-selectable from 8 options
- Dark palette: `#0a0a0a` (900) → `#3a3a3a` (500) (CSS variables `--dark-900` through `--dark-500`)
- Light mode: toggled via `data-theme="light"` on `<html>`, persisted in `localStorage` key `sc_theme_mode`
- Light mode overrides dark palette variables to light grays/whites and adds text color overrides
- Fonts: Barlow Condensed (headings), Inter (body)
- Mobile-first with `overflow-x-hidden` on all pages, max-width 512px on desktop
- `env(safe-area-inset-top)` for iPhone dynamic island

### Haptics
- Global light haptic on all button/link taps via `pointerdown` listener in `App.jsx`
- Capacitor Haptics plugin for native platforms (ImpactStyle.Light for all buttons, ImpactStyle.Heavy for lift logging)
- Web Vibration API fallback
- Toggleable in Settings (localStorage key: `sc_haptics`)

### Page Transitions
- CSS `@keyframes page-fade-in` with React key-based remounting via `PageWrapper` in App.jsx

### LocalStorage Keys
- `sc_user` — authenticated user object
- `sc_haptics` — haptics enabled/disabled
- `sc_theme_mode` — 'dark' or 'light' (appearance mode)
- `sc_workout_days` — array of ISO date strings for consistency tracking
- `sc_unlocked` — JSON object of temporarily ad-unlocked features `{ featureId: expiryTimestamp }`
- `sc_chart_lifts` — selected exercises for Dashboard overlay chart (max 3)
- `sc_profile_lifts` — selected exercises for Overview Strength Profile chart (max 3)

### SessionStorage Keys
- `sc_session_logs` — current workout session lifts

## Development

```bash
# Local dev (runs both server on :3001 and client on :5173)
npm run dev

# Build client
cd client && npm run build

# Sync to iOS after build
LANG=en_US.UTF-8 npx cap sync ios

# Open Xcode project
open client/ios/App/App.xcworkspace

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

### Capacitor / Native Builds
- Config: `client/capacitor.config.ts`
- App ID: `com.strengthcharts.app`
- iOS scheme: `capacitor`
- Native API base URL: `https://strength-charts.vercel.app/api`
- Signing: Apple Development certificate for `cameronjkhami@gmail.com`
- CocoaPods requires `LANG=en_US.UTF-8` environment variable
- After any code change: `npm run build` → `npx cap sync ios` → build in Xcode

### Vite Dev Proxy
Client proxies `/api` requests to `http://localhost:3001` during development (configured in `client/vite.config.js`).

## Important Rules

1. **DO NOT reseed production database** — user accounts persist via `CREATE TABLE IF NOT EXISTS`
2. All seed users have PIN `123456`
3. Weights are always stored in kg — convert on display only
4. The `rpe` column was added via ALTER TABLE migration in `db.js` — it may not exist in older databases
5. Friendships are bidirectional — two rows per friendship (one per direction)
6. Keep `overflow-x-hidden` on all page containers to prevent mobile horizontal scroll
7. Bottom nav has 6 tabs — text is `text-[9px]` to fit; tabs are: Home, Log Lift, My Lifts, Overview, Friends, Profile
8. Strength rankings legend lives on the Overview page only (not Dashboard)
9. Display name editing is in Settings page only (not Profile)
10. Always run `LANG=en_US.UTF-8` before CocoaPods/Capacitor sync commands
11. After code changes, rebuild client and sync iOS: `cd client && npm run build && LANG=en_US.UTF-8 npx cap sync ios`

## Product Direction

### Planned Features
- Expanded exercise library
- Social feed / workout sharing (Hevy-style shareable workout cards)
- Enhanced challenge system with friend-vs-friend competitions
- App Store launch (iOS first, then Android)

### Revenue Model
- **Free tier**: Core lift tracking, PR logging, basic stats
- **Pro subscription**: Advanced analytics, achievements, friend leaderboard, training tips, export
- **Rewarded ads**: Watch ad → unlock Pro features for 24 hours (drives conversion to paid Pro)
- **Estimated rewarded ad eCPM**: $10–$30 (US iOS)
