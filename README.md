# StrengthCharts

Personal records tracker and strength ranking platform for friend groups. Mobile-first PWA optimized for iPhone Safari.

## Setup

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Seed the database with sample data (3 users, all PIN: 1234)
npm run seed

# Start development (runs both server + client)
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

## Sample Users

| Username | PIN  | Description |
|----------|------|-------------|
| marcus   | 1234 | Advanced lifter, ~198 lbs |
| sarah    | 1234 | Intermediate lifter, ~139 lbs |
| jake     | 1234 | Beginner/Intermediate, ~176 lbs |

## Tech Stack

- **Frontend**: React + Tailwind CSS + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **PWA**: Service worker + manifest for Add to Home Screen

## Production Build

```bash
npm run build
npm run server
```
