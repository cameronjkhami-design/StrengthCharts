const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/friends/:userId — list friends for a user
router.get('/:userId', async (req, res) => {
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name
          FROM friendships f
          JOIN users u ON u.id = f.friend_id
          WHERE f.user_id = ?
          ORDER BY u.display_name ASC`,
    args: [parseInt(req.params.userId)]
  });
  res.json({ friends: result.rows });
});

// GET /api/friends/:userId/search?q=term — search users to add as friends
router.get('/:userId/search', async (req, res) => {
  const { userId } = req.params;
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ users: [] });
  }

  const searchTerm = `%${q.trim()}%`;
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name,
            CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_friend
          FROM users u
          LEFT JOIN friendships f ON f.user_id = ? AND f.friend_id = u.id
          WHERE u.id != ? AND (u.username LIKE ? OR u.display_name LIKE ?)
          ORDER BY u.display_name ASC
          LIMIT 20`,
    args: [parseInt(userId), parseInt(userId), searchTerm, searchTerm]
  });
  res.json({ users: result.rows });
});

// POST /api/friends — add a friend (bidirectional)
router.post('/', async (req, res) => {
  const { user_id, friend_id } = req.body;
  if (!user_id || !friend_id || user_id === friend_id) {
    return res.status(400).json({ error: 'Invalid user or friend ID' });
  }

  const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [user_id] });
  const friendResult = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [friend_id] });
  if (userResult.rows.length === 0 || friendResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    await db.batch([
      { sql: 'INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)', args: [user_id, friend_id] },
      { sql: 'INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)', args: [friend_id, user_id] },
    ], 'write');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// DELETE /api/friends — remove a friend (bidirectional)
router.delete('/', async (req, res) => {
  const { user_id, friend_id } = req.body;
  if (!user_id || !friend_id) {
    return res.status(400).json({ error: 'Invalid user or friend ID' });
  }

  try {
    await db.batch([
      { sql: 'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', args: [user_id, friend_id] },
      { sql: 'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', args: [friend_id, user_id] },
    ], 'write');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
