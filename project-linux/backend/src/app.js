require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Serve the frontend folder as static files ────────────────────────────────
// This means http://localhost:3000 opens index.html automatically.
// No CORS needed, no separate file server, cookies just work.
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── Body / cookie parsing ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

// ─── Global rate limit ────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Any unknown route → serve index.html (handles direct navigation to /homepage etc.)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀  Server running — open your browser at:`);
    console.log(`    http://localhost:${PORT}`);
  });
}

start();
