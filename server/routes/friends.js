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
    sql: `SELECT u.id, u.username, u.display_name, u.profile_photo
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

// GET /api/friends/:userId/profile/:friendId — get a friend's public profile
router.get('/:userId/profile/:friendId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const friendId = parseInt(req.params.friendId);

  // Verify they are friends
  const friendship = await db.execute({
    sql: "SELECT id FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'accepted'",
    args: [userId, friendId]
  });
  if (friendship.rows.length === 0) {
    return res.status(403).json({ error: 'Not friends with this user' });
  }

  // Get friend's user info + privacy settings
  const userResult = await db.execute({
    sql: 'SELECT id, username, display_name, unit_pref, is_premium, privacy_settings, profile_photo, showcase_badges, created_at FROM users WHERE id = ?',
    args: [friendId]
  });
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const friend = userResult.rows[0];
  let privacy = {};
  try {
    privacy = friend.privacy_settings ? JSON.parse(friend.privacy_settings) : {};
  } catch (e) {
    privacy = {};
  }

  // Defaults: everything visible
  const showPrs = privacy.show_prs !== false;
  const showLifts = privacy.show_lifts !== false;
  const showBodyweight = privacy.show_bodyweight !== false;
  const showAchievements = privacy.show_achievements !== false;

  let showcaseBadges = [];
  try {
    showcaseBadges = friend.showcase_badges ? JSON.parse(friend.showcase_badges) : [];
  } catch (e) {
    showcaseBadges = [];
  }

  const profile = {
    id: friend.id,
    username: friend.username,
    display_name: friend.display_name,
    is_premium: friend.is_premium,
    profile_photo: friend.profile_photo,
    showcase_badges: showcaseBadges,
    created_at: friend.created_at,
    privacy: { showPrs, showLifts, showBodyweight, showAchievements },
  };

  // PRs
  if (showPrs) {
    const prs = await db.execute({
      sql: `SELECT exercise_name, weight_kg, reps,
              weight_kg * (1 + reps / 30.0) as e1rm
            FROM lift_logs
            WHERE user_id = ?
            GROUP BY exercise_name
            HAVING e1rm = MAX(weight_kg * (1 + reps / 30.0))
            ORDER BY e1rm DESC`,
      args: [friendId]
    });
    profile.prs = prs.rows;
  }

  // Lift history
  if (showLifts) {
    const lifts = await db.execute({
      sql: 'SELECT id, exercise_name, weight_kg, reps, rpe, logged_at FROM lift_logs WHERE user_id = ? ORDER BY logged_at DESC',
      args: [friendId]
    });
    profile.lifts = lifts.rows;
  }

  // Bodyweight
  if (showBodyweight) {
    const bw = await db.execute({
      sql: 'SELECT weight_kg, logged_at FROM bodyweight_logs WHERE user_id = ? ORDER BY logged_at DESC',
      args: [friendId]
    });
    profile.bodyweight = bw.rows;
  }

  // Friend count
  const friendCount = await db.execute({
    sql: "SELECT COUNT(*) as count FROM friendships WHERE user_id = ? AND status = 'accepted'",
    args: [friendId]
  });
  profile.friendCount = friendCount.rows[0].count;

  res.json({ profile });
});

module.exports = router;
