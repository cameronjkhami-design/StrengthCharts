const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const router = express.Router();

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { username, pin, display_name } = req.body;
  if (!username || !pin || pin.length !== 4) {
    return res.status(400).json({ error: 'Username and 4-digit PIN required' });
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username.toLowerCase()]
  });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const result = await db.execute({
    sql: 'INSERT INTO users (username, pin_hash, display_name) VALUES (?, ?, ?)',
    args: [username.toLowerCase(), hashPin(pin), display_name || username]
  });

  const user = await db.execute({
    sql: 'SELECT id, username, display_name, unit_pref, is_premium, premium_purchased_at, created_at FROM users WHERE id = ?',
    args: [Number(result.lastInsertRowid)]
  });
  res.status(201).json({ user: user.rows[0] });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN required' });
  }

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, unit_pref, is_premium, premium_purchased_at, created_at, pin_hash FROM users WHERE username = ?',
    args: [username.toLowerCase()]
  });

  const user = result.rows[0];
  if (!user || user.pin_hash !== hashPin(pin)) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }

  const { pin_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// PUT /api/auth/user/:id
router.put('/user/:id', async (req, res) => {
  const { display_name, unit_pref, is_premium } = req.body;
  const updates = [];
  const params = [];

  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name); }
  if (unit_pref !== undefined) { updates.push('unit_pref = ?'); params.push(unit_pref); }
  if (is_premium !== undefined) { updates.push('is_premium = ?'); params.push(is_premium ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(parseInt(req.params.id));
  await db.execute({
    sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    args: params
  });

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, unit_pref, is_premium, premium_purchased_at, created_at FROM users WHERE id = ?',
    args: [parseInt(req.params.id)]
  });
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/user/:id/premium
router.put('/user/:id/premium', async (req, res) => {
  const { is_premium } = req.body;
  const purchased_at = is_premium ? new Date().toISOString() : null;

  await db.execute({
    sql: 'UPDATE users SET is_premium = ?, premium_purchased_at = ? WHERE id = ?',
    args: [is_premium ? 1 : 0, purchased_at, parseInt(req.params.id)]
  });

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, unit_pref, is_premium, premium_purchased_at, created_at FROM users WHERE id = ?',
    args: [parseInt(req.params.id)]
  });

  res.json({ user: result.rows[0] });
});

module.exports = router;
