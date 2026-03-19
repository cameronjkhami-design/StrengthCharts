const express = require('express');
const crypto = require('crypto');
const { Resend } = require('resend');
const { db } = require('../db');
const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM || 'StrengthCharts <onboarding@resend.dev>';

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { username, pin, display_name, email } = req.body;
  if (!username || !pin || pin.length !== 6) {
    return res.status(400).json({ error: 'Username and 6-digit PIN required' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username.toLowerCase()]
  });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const existingEmail = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.toLowerCase()]
  });
  if (existingEmail.rows.length > 0) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const result = await db.execute({
    sql: 'INSERT INTO users (username, pin_hash, display_name, email) VALUES (?, ?, ?, ?)',
    args: [username.toLowerCase(), hashPin(pin), display_name || username, email.toLowerCase()]
  });

  const user = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, created_at FROM users WHERE id = ?',
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
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, created_at, pin_hash FROM users WHERE username = ?',
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

  const { privacy_settings, theme_color } = req.body;
  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name); }
  if (unit_pref !== undefined) { updates.push('unit_pref = ?'); params.push(unit_pref); }
  if (is_premium !== undefined) { updates.push('is_premium = ?'); params.push(is_premium ? 1 : 0); }
  if (privacy_settings !== undefined) { updates.push('privacy_settings = ?'); params.push(JSON.stringify(privacy_settings)); }
  if (theme_color !== undefined) { updates.push('theme_color = ?'); params.push(theme_color); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(parseInt(req.params.id));
  await db.execute({
    sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    args: params
  });

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, created_at FROM users WHERE id = ?',
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
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, created_at FROM users WHERE id = ?',
    args: [parseInt(req.params.id)]
  });

  res.json({ user: result.rows[0] });
});

// POST /api/auth/forgot-pin — send 6-digit reset code to email
router.post('/forgot-pin', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = await db.execute({
    sql: 'SELECT id, username FROM users WHERE email = ?',
    args: [email.toLowerCase()]
  });

  // Always return success to prevent email enumeration
  if (result.rows.length === 0) {
    return res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  }

  const user = result.rows[0];

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Invalidate previous tokens
  await db.execute({
    sql: 'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
    args: [user.id]
  });

  await db.execute({
    sql: 'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    args: [user.id, hashPin(code), expiresAt]
  });

  // Send email via Resend
  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email.toLowerCase()],
      subject: 'StrengthCharts — Reset Your PIN',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 12px;">
          <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">STRENGTH<span style="color: #FF6B35;">CHARTS</span></h1>
          <p style="color: #999; font-size: 14px; margin-bottom: 24px;">PIN Reset Request</p>
          <p style="font-size: 14px; margin-bottom: 16px;">Hi ${user.username}, here's your reset code:</p>
          <div style="background: #1e1e1e; border: 2px solid #FF6B35; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #FF6B35;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    if (sendError) throw sendError;
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }

  res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
});

// POST /api/auth/reset-pin — verify code and set new PIN
router.post('/reset-pin', async (req, res) => {
  const { email, code, new_pin } = req.body;
  if (!email || !code || !new_pin) {
    return res.status(400).json({ error: 'Email, code, and new PIN required' });
  }
  if (new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  }

  const userResult = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.toLowerCase()]
  });
  if (userResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }

  const userId = userResult.rows[0].id;

  const tokenResult = await db.execute({
    sql: 'SELECT id, token, expires_at FROM password_reset_tokens WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
    args: [userId]
  });

  if (tokenResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }

  const tokenRow = tokenResult.rows[0];

  if (new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }

  if (tokenRow.token !== hashPin(code)) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }

  // Mark token as used and update PIN
  await db.execute({
    sql: 'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
    args: [tokenRow.id]
  });

  await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
    args: [hashPin(new_pin), userId]
  });

  res.json({ message: 'PIN reset successfully. You can now log in.' });
});

module.exports = router;
