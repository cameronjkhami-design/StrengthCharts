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
      email TEXT,
      unit_pref TEXT DEFAULT 'lbs',
      is_premium INTEGER DEFAULT 0,
      premium_purchased_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      rpe REAL,
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

  // Migrations: add columns that may not exist yet
  try {
    await db.execute({ sql: 'ALTER TABLE lift_logs ADD COLUMN rpe REAL', args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: 'ALTER TABLE users ADD COLUMN email TEXT', args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN privacy_settings TEXT DEFAULT '{}'", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN theme_color TEXT DEFAULT '#FFD700'", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN sex TEXT", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN profile_photo TEXT", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN showcase_badges TEXT DEFAULT '[]'", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    await db.execute({ sql: "ALTER TABLE users ADD COLUMN auth_provider_id TEXT", args: [] });
  } catch (e) {
    // Column already exists — ignore
  }
}

module.exports = { db, initDb };
