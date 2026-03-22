const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');
const appleSignin = require('apple-signin-auth');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const router = express.Router();

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.strengthcharts.app';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM || 'StrengthCharts <onboarding@resend.dev>';
const BCRYPT_ROUNDS = 10;

// Legacy SHA256 hash — used only for migration of old PINs
function hashPinLegacy(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  message: { error: 'Too many reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  const result = await db.execute({
    sql: 'INSERT INTO users (username, pin_hash, display_name, email) VALUES (?, ?, ?, ?)',
    args: [username.toLowerCase(), pinHash, display_name || username, email.toLowerCase()]
  });

  const user = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, created_at FROM users WHERE id = ?',
    args: [Number(result.lastInsertRowid)]
  });

  const token = generateToken(user.rows[0].id);
  res.status(201).json({ user: user.rows[0], token });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN required' });
  }

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, created_at, pin_hash FROM users WHERE username = ?',
    args: [username.toLowerCase()]
  });

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }

  // Check PIN — support both bcrypt and legacy SHA256 hashes
  let pinValid = false;
  if (user.pin_hash.startsWith('$2')) {
    // bcrypt hash
    pinValid = await bcrypt.compare(pin, user.pin_hash);
  } else {
    // Legacy SHA256 — migrate to bcrypt on successful login
    pinValid = user.pin_hash === hashPinLegacy(pin);
    if (pinValid) {
      const newHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
      await db.execute({
        sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
        args: [newHash, user.id]
      });
    }
  }

  if (!pinValid) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }

  const { pin_hash, ...safeUser } = user;
  const token = generateToken(user.id);
  res.json({ user: safeUser, token });
});

// GET /api/auth/user/:id — refresh user data (requires auth)
router.get('/user/:id', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, created_at FROM users WHERE id = ?',
    args: [targetId]
  });
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/user/:id
router.put('/user/:id', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { display_name, unit_pref, is_premium } = req.body;
  const updates = [];
  const params = [];

  const { privacy_settings, theme_color, sex, profile_photo, showcase_badges } = req.body;
  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name); }
  if (unit_pref !== undefined) { updates.push('unit_pref = ?'); params.push(unit_pref); }
  if (is_premium !== undefined) { updates.push('is_premium = ?'); params.push(is_premium ? 1 : 0); }
  if (privacy_settings !== undefined) { updates.push('privacy_settings = ?'); params.push(JSON.stringify(privacy_settings)); }
  if (theme_color !== undefined) { updates.push('theme_color = ?'); params.push(theme_color); }
  if (sex !== undefined) { updates.push('sex = ?'); params.push(sex); }
  if (profile_photo !== undefined) { updates.push('profile_photo = ?'); params.push(profile_photo); }
  if (showcase_badges !== undefined) { updates.push('showcase_badges = ?'); params.push(JSON.stringify(showcase_badges)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(targetId);
  await db.execute({
    sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    args: params
  });

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, created_at FROM users WHERE id = ?',
    args: [targetId]
  });
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/user/:id/premium
router.put('/user/:id/premium', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { is_premium } = req.body;
  const purchased_at = is_premium ? new Date().toISOString() : null;

  await db.execute({
    sql: 'UPDATE users SET is_premium = ?, premium_purchased_at = ? WHERE id = ?',
    args: [is_premium ? 1 : 0, purchased_at, targetId]
  });

  const result = await db.execute({
    sql: 'SELECT id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, created_at FROM users WHERE id = ?',
    args: [targetId]
  });

  res.json({ user: result.rows[0] });
});

// POST /api/auth/forgot-pin — send 6-digit reset code to email
router.post('/forgot-pin', resetLimiter, async (req, res) => {
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
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

  // Invalidate previous tokens
  await db.execute({
    sql: 'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
    args: [user.id]
  });

  await db.execute({
    sql: 'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    args: [user.id, codeHash, expiresAt]
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
router.post('/reset-pin', resetLimiter, async (req, res) => {
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

  // Support both bcrypt and legacy SHA256 reset tokens
  let codeValid = false;
  if (tokenRow.token.startsWith('$2')) {
    codeValid = await bcrypt.compare(code, tokenRow.token);
  } else {
    codeValid = tokenRow.token === hashPinLegacy(code);
  }

  if (!codeValid) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }

  // Mark token as used and update PIN with bcrypt
  await db.execute({
    sql: 'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
    args: [tokenRow.id]
  });

  const newPinHash = await bcrypt.hash(new_pin, BCRYPT_ROUNDS);
  await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
    args: [newPinHash, userId]
  });

  res.json({ message: 'PIN reset successfully. You can now log in.' });
});

// DELETE /api/auth/user/:id — delete account and all associated data
router.delete('/user/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (req.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required to delete account' });

  // Verify PIN
  const userResult = await db.execute({
    sql: 'SELECT pin_hash FROM users WHERE id = ?',
    args: [userId]
  });
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Support both bcrypt and legacy SHA256
  let pinValid = false;
  const storedHash = userResult.rows[0].pin_hash;
  if (storedHash.startsWith('$2')) {
    pinValid = await bcrypt.compare(pin, storedHash);
  } else {
    pinValid = storedHash === hashPinLegacy(pin);
  }

  if (!pinValid) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }

  // Delete all user data
  await db.execute({ sql: 'DELETE FROM lift_logs WHERE user_id = ?', args: [userId] });
  await db.execute({ sql: 'DELETE FROM bodyweight_logs WHERE user_id = ?', args: [userId] });
  await db.execute({ sql: 'DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', args: [userId, userId] });
  await db.execute({ sql: 'DELETE FROM password_reset_tokens WHERE user_id = ?', args: [userId] });
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });

  res.json({ message: 'Account deleted successfully' });
});

// ─── OAuth helpers ───

const USER_SELECT_COLS = 'id, username, display_name, email, unit_pref, is_premium, premium_purchased_at, privacy_settings, theme_color, sex, profile_photo, showcase_badges, auth_provider, created_at';

async function findOrCreateOAuthUser(provider, providerId, email, displayName) {
  // 1. Check if user already exists with this provider+id
  const existing = await db.execute({
    sql: 'SELECT ' + USER_SELECT_COLS + ', pin_hash FROM users WHERE auth_provider = ? AND auth_provider_id = ?',
    args: [provider, providerId]
  });
  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    const needsPin = user.pin_hash === 'OAUTH_PENDING';
    const { pin_hash, ...safeUser } = user;
    return { user: safeUser, needsPin, isNew: false };
  }

  // 2. Check if email matches an existing account — link it
  if (email) {
    const byEmail = await db.execute({
      sql: 'SELECT ' + USER_SELECT_COLS + ', pin_hash FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    });
    if (byEmail.rows.length > 0) {
      const user = byEmail.rows[0];
      await db.execute({
        sql: 'UPDATE users SET auth_provider = ?, auth_provider_id = ? WHERE id = ?',
        args: [provider, providerId, user.id]
      });
      const needsPin = user.pin_hash === 'OAUTH_PENDING';
      const { pin_hash, ...safeUser } = { ...user, auth_provider: provider };
      return { user: safeUser, needsPin, isNew: false };
    }
  }

  // 3. Create new user
  const username = `${provider}_${providerId.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase();
  // Ensure unique username
  let finalUsername = username;
  let attempt = 0;
  while (true) {
    const check = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [finalUsername] });
    if (check.rows.length === 0) break;
    attempt++;
    finalUsername = `${username}${attempt}`;
  }

  const result = await db.execute({
    sql: 'INSERT INTO users (username, pin_hash, display_name, email, auth_provider, auth_provider_id) VALUES (?, ?, ?, ?, ?, ?)',
    args: [finalUsername, 'OAUTH_PENDING', displayName || finalUsername, email ? email.toLowerCase() : null, provider, providerId]
  });

  const newUser = await db.execute({
    sql: 'SELECT ' + USER_SELECT_COLS + ' FROM users WHERE id = ?',
    args: [Number(result.lastInsertRowid)]
  });

  return { user: newUser.rows[0], needsPin: true, isNew: true };
}

// POST /api/auth/oauth/apple
router.post('/oauth/apple', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token required' });

  try {
    const decoded = await appleSignin.verifyIdToken(id_token, {
      audience: APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const { sub, email } = decoded;
    if (!sub) return res.status(400).json({ error: 'Invalid Apple token' });

    const { user, needsPin } = await findOrCreateOAuthUser('apple', sub, email, null);
    const token = generateToken(user.id);
    res.json({ user, token, needs_pin: needsPin });
  } catch (err) {
    console.error('Apple OAuth error:', err);
    res.status(401).json({ error: 'Apple sign-in failed' });
  }
});

// POST /api/auth/oauth/google
router.post('/oauth/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub, email, name } = payload;
    if (!sub) return res.status(400).json({ error: 'Invalid Google token' });

    const { user, needsPin } = await findOrCreateOAuthUser('google', sub, email, name);
    const token = generateToken(user.id);
    res.json({ user, token, needs_pin: needsPin });
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// POST /api/auth/oauth/set-pin — set PIN after first OAuth sign-in
router.post('/oauth/set-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  }

  // Only allow setting PIN if currently OAUTH_PENDING
  const userResult = await db.execute({
    sql: 'SELECT pin_hash FROM users WHERE id = ?',
    args: [req.userId]
  });
  if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  if (userResult.rows[0].pin_hash !== 'OAUTH_PENDING') {
    return res.status(400).json({ error: 'PIN already set' });
  }

  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
  await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
    args: [pinHash, req.userId]
  });

  const updated = await db.execute({
    sql: 'SELECT ' + USER_SELECT_COLS + ' FROM users WHERE id = ?',
    args: [req.userId]
  });
  res.json({ user: updated.rows[0] });
});

module.exports = router;
