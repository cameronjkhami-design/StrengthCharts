const express = require('express');
const { db } = require('../db');
const router = express.Router();

function calcE1RM(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// GET /api/leaderboard?userId=X (optional: filter to friends + self)
router.get('/', async (req, res) => {
  const { userId } = req.query;
  let users;

  if (userId) {
    const uid = parseInt(userId);
    // Verify the requesting user matches
    if (req.userId !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const friendResult = await db.execute({
      sql: "SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'",
      args: [uid]
    });
    const friendIds = friendResult.rows.map(r => r.friend_id);
    friendIds.push(uid);
    const placeholders = friendIds.map(() => '?').join(',');
    const userResult = await db.execute({
      sql: `SELECT id, username, display_name FROM users WHERE id IN (${placeholders})`,
      args: friendIds
    });
    users = userResult.rows;
  } else {
    const userResult = await db.execute({ sql: 'SELECT id, username, display_name FROM users', args: [] });
    users = userResult.rows;
  }

  const leaderboard = [];
  for (const user of users) {
    const logsResult = await db.execute({
      sql: 'SELECT * FROM lift_logs WHERE user_id = ?',
      args: [user.id]
    });

    const bwResult = await db.execute({
      sql: 'SELECT weight_kg FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1',
      args: [user.id]
    });

    const bodyweight_kg = bwResult.rows[0] ? bwResult.rows[0].weight_kg : null;

    const prMap = {};
    for (const log of logsResult.rows) {
      const e1rm = calcE1RM(log.weight_kg, log.reps);
      if (!prMap[log.exercise_name] || e1rm > prMap[log.exercise_name]) {
        prMap[log.exercise_name] = e1rm;
      }
    }

    const mainLifts = ['Squat', 'Bench Press', 'Deadlift'];
    let totalRelativeScore = 0;
    const liftScores = {};

    for (const lift of mainLifts) {
      const e1rm = prMap[lift] || 0;
      const ratio = bodyweight_kg ? e1rm / bodyweight_kg : 0;
      liftScores[lift] = {
        e1rm: Math.round(e1rm * 100) / 100,
        ratio: Math.round(ratio * 100) / 100
      };
      totalRelativeScore += ratio;
    }

    const allPrs = {};
    for (const [exercise, e1rm] of Object.entries(prMap)) {
      allPrs[exercise] = {
        e1rm: Math.round(e1rm * 100) / 100,
        ratio: bodyweight_kg ? Math.round((e1rm / bodyweight_kg) * 100) / 100 : 0
      };
    }

    leaderboard.push({
      user_id: user.id,
      username: user.username,
      display_name: user.display_name || user.username,
      bodyweight_kg,
      main_lift_scores: liftScores,
      all_prs: allPrs,
      total_relative_score: Math.round(totalRelativeScore * 100) / 100
    });
  }

  leaderboard.sort((a, b) => b.total_relative_score - a.total_relative_score);
  res.json({ leaderboard });
});

module.exports = router;
