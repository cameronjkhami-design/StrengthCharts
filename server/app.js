const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const liftRoutes = require('./routes/lifts');
const bodyweightRoutes = require('./routes/bodyweight');
const leaderboardRoutes = require('./routes/leaderboard');
const friendRoutes = require('./routes/friends');
const { initDb } = require('./db');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// CORS — restrict to known origins
const ALLOWED_ORIGINS = [
  'https://strength-charts.vercel.app',
  'capacitor://localhost',    // iOS Capacitor
  'http://localhost',         // Android Capacitor
  'http://localhost:5173',    // Vite dev
  'http://localhost:3001',    // Local server
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
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
// Auth routes handle their own authentication (login/signup are public)
app.use('/api/auth', authRoutes);
// All other routes require JWT authentication
app.use('/api/lifts', authenticateToken, liftRoutes);
app.use('/api/bodyweight', authenticateToken, bodyweightRoutes);
app.use('/api/friends', authenticateToken, friendRoutes);
app.use('/api/leaderboard', authenticateToken, leaderboardRoutes);

module.exports = app;
