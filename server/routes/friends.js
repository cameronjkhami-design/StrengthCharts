const express = require('express');
const { db } = require('../db');
const router = express.Router();

// GET /api/friends/search?q=term&userId=X — search users (defined FIRST to avoid :userId param collision)
router.get('/search', async (req, res) => {
  const { userId, q } = req.query;
  if (!userId || !q || q.trim().length < 2) {
    return res.json({ users: [] });
  }

  const uid = parseInt(userId);
  const searchTerm = `%${q.trim()}%`;
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name,
            f_sent.status as sent_status,
            f_recv.status as recv_status
          FROM users u
          LEFT JOIN friendships f_sent ON f_sent.user_id = ? AND f_sent.friend_id = u.id
          LEFT JOIN friendships f_recv ON f_recv.user_id = u.id AND f_recv.friend_id = ?
          WHERE u.id != ? AND (u.username LIKE ? OR u.display_name LIKE ?)
          ORDER BY u.display_name ASC
          LIMIT 20`,
    args: [uid, uid, uid, searchTerm, searchTerm]
  });

  const users = result.rows.map(u => {
    let friend_status = 'none';
    if (u.sent_status === 'accepted' || u.recv_status === 'accepted') {
      friend_status = 'accepted';
    } else if (u.sent_status === 'pending') {
      friend_status = 'pending_sent';
    } else if (u.recv_status === 'pending') {
      friend_status = 'pending_received';
    }
    return {
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      friend_status,
    };
  });

  res.json({ users });
});

// GET /api/friends/:userId — list accepted friends
router.get('/:userId', async (req, res) => {
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name
          FROM friendships f
          JOIN users u ON u.id = f.friend_id
          WHERE f.user_id = ? AND f.status = 'accepted'
          ORDER BY u.display_name ASC`,
    args: [parseInt(req.params.userId)]
  });
  res.json({ friends: result.rows });
});

// GET /api/friends/:userId/pending — list incoming pending requests
router.get('/:userId/pending', async (req, res) => {
  const result = await db.execute({
    sql: `SELECT u.id, u.username, u.display_name, f.created_at
          FROM friendships f
          JOIN users u ON u.id = f.user_id
          WHERE f.friend_id = ? AND f.status = 'pending'
          ORDER BY f.created_at DESC`,
    args: [parseInt(req.params.userId)]
  });
  res.json({ requests: result.rows });
});

// POST /api/friends — send friend request (auto-accept if reverse pending exists)
router.post('/', async (req, res) => {
  const { user_id, friend_id } = req.body;
  if (!user_id || !friend_id || user_id === friend_id) {
    return res.status(400).json({ error: 'Invalid user or friend ID' });
  }

  try {
    // Check if reverse pending request exists
    const reverse = await db.execute({
      sql: "SELECT id FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'pending'",
      args: [friend_id, user_id]
    });

    if (reverse.rows.length > 0) {
      // Auto-accept: update existing to accepted, create reverse as accepted
      await db.batch([
        { sql: "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?", args: [friend_id, user_id] },
        { sql: "INSERT OR REPLACE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')", args: [user_id, friend_id] },
      ], 'write');
      return res.json({ success: true, status: 'accepted' });
    }

    // No reverse — create pending request
    await db.execute({
      sql: "INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')",
      args: [user_id, friend_id]
    });
    res.json({ success: true, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/friends/accept — accept incoming request
router.put('/accept', async (req, res) => {
  const { user_id, friend_id } = req.body;
  // user_id is the person accepting, friend_id is the person who sent the request
  try {
    await db.batch([
      { sql: "UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?", args: [friend_id, user_id] },
      { sql: "INSERT OR REPLACE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')", args: [user_id, friend_id] },
    ], 'write');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// PUT /api/friends/decline — decline/cancel pending request
router.put('/decline', async (req, res) => {
  const { user_id, friend_id } = req.body;
  try {
    await db.execute({
      sql: 'DELETE FROM friendships WHERE user_id = ? AND friend_id = ?',
      args: [friend_id, user_id]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// DELETE /api/friends — remove friend (bidirectional)
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
