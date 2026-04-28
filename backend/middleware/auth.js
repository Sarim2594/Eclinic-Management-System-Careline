const { verifyAuthToken } = require('../utils/authToken');
const { query } = require('../db');

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];

  try {
    req.auth = verifyAuthToken(token);
    if (req.auth?.user_id) {
      await query(
        `UPDATE app_users
         SET last_seen_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [req.auth.user_id]
      );
    }
    next();
  } catch (error) {
    res.status(error.status || 401).json({ detail: error.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return res.status(403).json({ detail: 'You do not have access to this resource' });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
