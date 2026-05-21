const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth, guestOnly } = require('../middleware/auth');

const router = express.Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────

// Strict limit on login attempts to slow brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slightly more lenient for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many registrations from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validation rule sets ─────────────────────────────────────────────────────

const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isAlpha('en-US', { ignore: ' ' }).withMessage('First name must contain only letters.')
    .isLength({ max: 50 }).withMessage('First name must be at most 50 characters.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isAlpha('en-US', { ignore: ' ' }).withMessage('Last name must contain only letters.')
    .isLength({ max: 50 }).withMessage('Last name must be at most 50 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .isLength({ max: 128 }).withMessage('Password is too long.'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Register a new account
router.post('/register', registerLimiter, guestOnly, registerValidation, authController.register);

// Sign in
router.post('/login', loginLimiter, guestOnly, loginValidation, authController.login);

// Sign out
router.post('/logout', requireAuth, authController.logout);

// Get current logged-in user
router.get('/me', requireAuth, authController.me);

module.exports = router;
