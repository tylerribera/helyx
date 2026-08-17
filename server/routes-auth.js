/* ═══════════════════════════════════════════════════════════════
   HELYX — Auth Routes
   POST  /api/auth/register
   POST  /api/auth/login
   POST  /api/auth/logout
   POST  /api/auth/forgot-password
   POST  /api/auth/reset-password
   GET   /api/auth/me
   PUT   /api/auth/me
   PUT   /api/auth/change-password
   DELETE /api/auth/me   — delete account
   ═══════════════════════════════════════════════════════════════ */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const db = require('./db');
const { requireAuth } = require('./middleware');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('./email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const RESET_EXPIRY_MINUTES = 60;

function setAuthCookie(res, token) {
    const isSecure = process.env.COOKIE_SECURE === 'true';
    res.cookie('helyx_token', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        premium: !!user.premium,
        premiumUntil: user.premium_until || null,
        createdAt: user.created_at
    };
}

// ── POST /register ────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body || {};

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (password.length > 128) {
            return res.status(400).json({ error: 'Password is too long' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const cleanFirst = validator.escape(String(firstName || '').trim()).slice(0, 50);
        const cleanLast = validator.escape(String(lastName || '').trim()).slice(0, 50);

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = db.prepare(
            'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
        ).run(cleanEmail, hash, cleanFirst, cleanLast);

        const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        setAuthCookie(res, token);

        sendWelcomeEmail(cleanEmail, cleanFirst).catch(err => {
            console.error('Failed to send welcome email:', err.message);
        });

        res.status(201).json({
            message: 'Account created',
            token,
            user: {
                id: result.lastInsertRowid,
                email: cleanEmail,
                firstName: cleanFirst,
                lastName: cleanLast,
                premium: false,
                premiumUntil: null
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ── POST /login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(cleanEmail);

        if (!user) return res.status(401).json({ error: 'Invalid email or password' });
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        setAuthCookie(res, token);

        res.json({ message: 'Signed in', token, user: publicUser(user) });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('helyx_token', { path: '/' });
    res.json({ message: 'Signed out' });
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(user) });
});

// ── PUT /me — update name ─────────────────────────────────────
router.put('/me', requireAuth, (req, res) => {
    try {
        const { firstName, lastName } = req.body || {};
        const cleanFirst = validator.escape(String(firstName || '').trim()).slice(0, 50);
        const cleanLast = validator.escape(String(lastName || '').trim()).slice(0, 50);

        db.prepare(
            "UPDATE users SET first_name = ?, last_name = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(cleanFirst, cleanLast, req.user.id);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        res.json({ message: 'Profile updated', user: publicUser(user) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ── DELETE /me — delete account ───────────────────────────────
router.delete('/me', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
        res.clearCookie('helyx_token', { path: '/' });
        res.json({ message: 'Account deleted' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ── PUT /change-password ──────────────────────────────────────
router.put('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });
        }

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        db.prepare(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(hash, req.user.id);

        res.json({ message: 'Password changed' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ── POST /forgot-password ─────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const user = db.prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1').get(cleanEmail);

        // Always return the same response to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If an account exists with that email, a reset link has been sent' });
        }

        db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000).toISOString();

        db.prepare(
            'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)'
        ).run(user.id, resetToken, expiresAt);

        sendPasswordResetEmail(user.email, resetToken).catch(err => {
            console.error('Failed to send reset email:', err.message);
        });

        res.json({ message: 'If an account exists with that email, a reset link has been sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ── POST /reset-password ──────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (!token) return res.status(400).json({ error: 'Reset token is required' });
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });
        }

        const resetRecord = db.prepare(
            "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
        ).get(token);

        if (!resetRecord) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const updateUser = db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?");
        const markUsed = db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?');

        db.transaction(() => {
            updateUser.run(hash, resetRecord.user_id);
            markUsed.run(resetRecord.id);
        })();

        res.json({ message: 'Password reset. You can now sign in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

module.exports = router;
