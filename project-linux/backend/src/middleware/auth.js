/**
 * requireAuth
 * Blocks access to a route unless the user has an active session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please sign in.' });
  }
  next();
}

/**
 * guestOnly
 * Prevents already-logged-in users from hitting auth endpoints (sign-in, register).
 */
function guestOnly(req, res, next) {
  if (req.session && req.session.userId) {
    return res.status(400).json({ success: false, message: 'You are already signed in.' });
  }
  next();
}

module.exports = { requireAuth, guestOnly };
