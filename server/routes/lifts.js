const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/lifts/:userId — all lift logs for a user
router.get('/:userId', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ? ORDER BY logged_at DESC',
    args: [targetId]
  });
  res.json({ logs: result.rows });
});

// GET /api/lifts/:userId/exercises — distinct exercises for a user
router.get('/:userId/exercises', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT DISTINCT exercise_name FROM lift_logs WHERE user_id = ? ORDER BY exercise_name',
    args: [targetId]
  });
  res.json({ exercises: result.rows.map(e => e.exercise_name) });
});

// GET /api/lifts/:userId/exercise/:name — logs for a specific exercise
router.get('/:userId/exercise/:name', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ? AND exercise_name = ? ORDER BY logged_at DESC',
    args: [targetId, req.params.name]
  });
  res.json({ logs: result.rows });
});

// GET /api/lifts/:userId/prs — best estimated 1RM per exercise
router.get('/:userId/prs', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM lift_logs WHERE user_id = ?',
    args: [targetId]
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

  // Ownership check: can only log lifts for yourself
  if (req.userId !== user_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!user_id || !exercise_name || weight_kg === undefined || !reps) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Input validation
  if (typeof exercise_name !== 'string' || exercise_name.trim().length === 0 || exercise_name.length > 100) {
    return res.status(400).json({ error: 'Exercise name must be 1-100 characters' });
  }
  if (typeof weight_kg !== 'number' || weight_kg < 0 || weight_kg > 1000) {
    return res.status(400).json({ error: 'Weight must be between 0 and 1000 kg' });
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) {
    return res.status(400).json({ error: 'Reps must be between 1 and 100' });
  }
  if (rpe !== undefined && rpe !== null && (typeof rpe !== 'number' || rpe < 0 || rpe > 10)) {
    return res.status(400).json({ error: 'RPE must be between 0 and 10' });
  }
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 500)) {
    return res.status(400).json({ error: 'Notes must be under 500 characters' });
  }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO lift_logs (user_id, exercise_name, weight_kg, reps, logged_at, notes, rpe) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [user_id, exercise_name.trim(), weight_kg, reps, logged_at || new Date().toISOString(), notes || null, rpe || null]
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

// DELETE /api/lifts/:id — delete a single lift log
router.delete('/:id', async (req, res) => {
  const liftId = parseInt(req.params.id);

  // Verify ownership before deleting
  const lift = await db.execute({
    sql: 'SELECT user_id FROM lift_logs WHERE id = ?',
    args: [liftId]
  });
  if (lift.rows.length === 0) {
    return res.status(404).json({ error: 'Lift not found' });
  }
  if (lift.rows[0].user_id !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.execute({
    sql: 'DELETE FROM lift_logs WHERE id = ?',
    args: [liftId]
  });
  res.json({ success: true });
});

// DELETE /api/lifts/:userId/exercise/:name — delete all logs for an exercise
router.delete('/:userId/exercise/:name', async (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (req.userId !== targetId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.execute({
    sql: 'DELETE FROM lift_logs WHERE user_id = ? AND exercise_name = ?',
    args: [targetId, req.params.name]
  });
  res.json({ success: true });
});

module.exports = router;
