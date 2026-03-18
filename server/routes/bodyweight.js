const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/bodyweight/:userId
router.get('/:userId', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC',
    args: [parseInt(req.params.userId)]
  });
  res.json({ logs: result.rows });
});

// GET /api/bodyweight/:userId/latest
router.get('/:userId/latest', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1',
    args: [parseInt(req.params.userId)]
  });
  res.json({ log: result.rows[0] || null });
});

// POST /api/bodyweight
router.post('/', async (req, res) => {
  const { user_id, weight_kg, logged_at } = req.body;
  if (!user_id || weight_kg === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
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
  await db.execute({
    sql: 'DELETE FROM bodyweight_logs WHERE id = ?',
    args: [parseInt(req.params.id)]
  });
  res.json({ success: true });
});

module.exports = router;
