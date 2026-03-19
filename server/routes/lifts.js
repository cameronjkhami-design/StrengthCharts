const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/lifts/:userId — all lift logs for a user
router.get('/:userId', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ? ORDER BY logged_at DESC',
    args: [parseInt(req.params.userId)]
  });
  res.json({ logs: result.rows });
});

// GET /api/lifts/:userId/exercises — distinct exercises for a user
router.get('/:userId/exercises', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT DISTINCT exercise_name FROM lift_logs WHERE user_id = ? ORDER BY exercise_name',
    args: [parseInt(req.params.userId)]
  });
  res.json({ exercises: result.rows.map(e => e.exercise_name) });
});

// GET /api/lifts/:userId/exercise/:name — logs for a specific exercise
router.get('/:userId/exercise/:name', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ? AND exercise_name = ? ORDER BY logged_at DESC',
    args: [parseInt(req.params.userId), req.params.name]
  });
  res.json({ logs: result.rows });
});

// GET /api/lifts/:userId/prs — best estimated 1RM per exercise
router.get('/:userId/prs', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ?',
    args: [parseInt(req.params.userId)]
  });

  const prMap = {};
  for (const log of result.rows) {
    const e1rm = log.reps === 1 ? log.weight_kg : log.weight_kg * (1 + log.reps / 30);
    if (!prMap[log.exercise_name] || e1rm > prMap[log.exercise_name].estimated_1rm) {
      prMap[log.exercise_name] = {
        ...log,
        estimated_1rm: Math.round(e1rm * 100) / 100
      };
    }
  }

  res.json({ prs: Object.values(prMap) });
});

// POST /api/lifts — log a new lift
router.post('/', async (req, res) => {
  const { user_id, exercise_name, weight_kg, reps, logged_at, notes, rpe } = req.body;
  if (!user_id || !exercise_name || weight_kg === undefined || !reps) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO lift_logs (user_id, exercise_name, weight_kg, reps, logged_at, notes, rpe) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [user_id, exercise_name, weight_kg, reps, logged_at || new Date().toISOString(), notes || null, rpe || null]
    });

    const log = await db.execute({
      sql: 'SELECT * FROM lift_logs WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });
    res.status(201).json({ log: log.rows[0] });
  } catch (err) {
    if (err.message?.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Invalid user. Please log out and log back in.' });
    }
    res.status(500).json({ error: 'Failed to log lift' });
  }
});

// DELETE /api/lifts/:id
router.delete('/:id', async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM lift_logs WHERE id = ?',
    args: [parseInt(req.params.id)]
  });
  res.json({ success: true });
});

module.exports = router;
