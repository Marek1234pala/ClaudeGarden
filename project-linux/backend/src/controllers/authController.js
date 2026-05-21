const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * POST /api/auth/register
 * Creates a new user account.
 *
 * Body: { firstName, lastName, email, password }
 */
async function register(req, res) {
  // 1. Check validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { firstName, lastName, email, password } = req.body;

  try {
    // 2. Check if email is already taken
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        errors: [{ field: 'email', message: 'Email address is already registered.' }],
      });
    }

    // 3. Hash the password (bcrypt, 12 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Insert the new user
    const newUserId = await User.create({ firstName, lastName, email, password: hashedPassword });

    // 5. Auto sign-in: create session
    req.session.userId = newUserId;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: { id: newUserId, firstName, lastName, email },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

/**
 * POST /api/auth/login
 * Signs the user in and creates a session.
 *
 * Body: { email, password }
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 1. Look up user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        errors: [{ field: 'email', message: 'No account found with that email.' }],
      });
    }

    // 2. Compare password against bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        errors: [{ field: 'password', message: 'Incorrect password.' }],
      });
    }

    // 3. Regenerate session ID to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('[login] session regenerate error', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
      }

      req.session.userId = user.id;

      return res.status(200).json({
        success: true,
        message: 'Signed in successfully.',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
}

/**
 * GET /api/auth/me
 * Returns the currently logged-in user's profile.
 * Protected by requireAuth middleware.
 */
async function me(req, res) {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { register, login, logout, me };
