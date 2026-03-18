const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const liftRoutes = require('./routes/lifts');
const bodyweightRoutes = require('./routes/bodyweight');
const leaderboardRoutes = require('./routes/leaderboard');
const friendRoutes = require('./routes/friends');
const { initDb } = require('./db');

const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Initialize DB on first request
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('DB init error:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/lifts', liftRoutes);
app.use('/api/bodyweight', bodyweightRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

module.exports = app;
