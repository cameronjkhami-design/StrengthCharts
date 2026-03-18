const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', 'strengthcharts.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

async function initDb() {
  if (initialized) return;
  initialized = true;

  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      display_name TEXT,
      unit_pref TEXT DEFAULT 'lbs',
      is_premium INTEGER DEFAULT 0,
      premium_purchased_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bodyweight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lift_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      reps INTEGER NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
    );
  `);
}

module.exports = { db, initDb };
