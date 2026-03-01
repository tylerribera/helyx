/* ═══════════════════════════════════════════════════════════════
   HELYX — Auth Middleware
   JWT verification & user injection
   ═══════════════════════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Required auth — rejects 401 if not authenticated
 */
function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, email, first_name, last_name, email_verified, created_at FROM users WHERE id = ? AND is_active = 1').get(payload.userId);

        if (!user) {
            return res.status(401).json({ error: 'Account not found or deactivated' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired — please log in again' });
        }
        return res.status(401).json({ error: 'Invalid session' });
    }
}

/**
 * Optional auth — attaches user if token present, continues regardless
 */
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) return next();

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, email, first_name, last_name, email_verified, created_at FROM users WHERE id = ? AND is_active = 1').get(payload.userId);
        if (user) req.user = user;
    } catch {
        // Silently ignore invalid tokens for optional auth
    }

    next();
}

/**
 * Extract JWT from Authorization header or cookie
 */
function extractToken(req) {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Fall back to cookie
    if (req.cookies && req.cookies.helyx_token) {
        return req.cookies.helyx_token;
    }

    return null;
}

module.exports = { requireAuth, optionalAuth };
