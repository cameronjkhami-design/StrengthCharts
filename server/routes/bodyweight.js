const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/bodyweight/:userId
router.get('/:userId', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC',
    args: [targetId]
  });
  res.json({ logs: result.rows });
});

// GET /api/bodyweight/:userId/latest
router.get('/:userId/latest', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1',
    args: [targetId]
  });
  res.json({ log: result.rows[0] || null });
});

// POST /api/bodyweight
router.post('/', async (req, res) => {
  const { user_id, weight_kg, logged_at } = req.body;

  // Ownership check
  if (req.userId !== user_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!user_id || weight_kg === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Input validation
  if (typeof weight_kg !== 'number' || weight_kg < 20 || weight_kg > 350) {
    return res.status(400).json({ error: 'Bodyweight must be between 20 and 350 kg' });
  }

  const result = await db.execute({
    sql: 'INSERT INTO bodyweight_logs (user_id, weight_kg, logged_at) VALUES (?, ?, ?)',
    args: [user_id, weight_kg, logged_at || new Date().toISOString()]
  });

  const log = await db.execute({
    sql: 'SELECT * FROM bodyweight_logs WHERE id = ?',
    args: [Number(result.lastInsertRowid)]
  });
  res.status(201).json({ log: log.rows[0] });
});

// DELETE /api/bodyweight/:id
router.delete('/:id', async (req, res) => {
  const entryId = parseInt(req.params.id);

  // Verify ownership before deleting
  const entry = await db.execute({
    sql: 'SELECT user_id FROM bodyweight_logs WHERE id = ?',
    args: [entryId]
  });
  if (entry.rows.length === 0) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  if (entry.rows[0].user_id !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.execute({
    sql: 'DELETE FROM bodyweight_logs WHERE id = ?',
    args: [entryId]
  });
  res.json({ success: true });
});

module.exports = router;
