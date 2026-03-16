/* ═══════════════════════════════════════════════════════════════
   HELYX — Auth Routes
   POST /api/auth/register
   POST /api/auth/login
   POST /api/auth/logout
   POST /api/auth/forgot-password
   POST /api/auth/reset-password
   GET  /api/auth/me
   PUT  /api/auth/me
   PUT  /api/auth/change-password
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

function logActivity(userId, type, description) {
    try {
        db.prepare(
            'INSERT INTO account_activity (user_id, activity_type, description) VALUES (?, ?, ?)'
        ).run(userId, type, description);
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
}

// ── Helper: set auth cookie ──────────────────────────────────
function setAuthCookie(res, token) {
    const isSecure = process.env.COOKIE_SECURE === 'true';
    res.cookie('helyx_token', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
}

// ══════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Validate email
        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // Validate password
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        if (password.length > 128) {
            return res.status(400).json({ error: 'Password is too long' });
        }

        // Check password strength
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const cleanFirst = validator.escape(String(firstName || '').trim()).slice(0, 50);
        const cleanLast = validator.escape(String(lastName || '').trim()).slice(0, 50);

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Hash password & insert
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = db.prepare(
            'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
        ).run(cleanEmail, hash, cleanFirst, cleanLast);

        // Generate JWT
        const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        setAuthCookie(res, token);

        db.prepare(
            'INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)'
        ).run(result.lastInsertRowid);

        logActivity(result.lastInsertRowid, 'account_created', 'Account created');

        // Send welcome email (non-blocking)
        sendWelcomeEmail(cleanEmail, cleanFirst).catch(err => {
            console.error('Failed to send welcome email:', err.message);
        });

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: result.lastInsertRowid,
                email: cleanEmail,
                firstName: cleanFirst,
                lastName: cleanLast
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(cleanEmail);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
        setAuthCookie(res, token);
        logActivity(user.id, 'login', 'Signed in to account');

        res.json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ══════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
    res.clearCookie('helyx_token', { path: '/' });
    res.json({ message: 'Logged out successfully' });
});

// ══════════════════════════════════════════════════════════════
// GET /api/auth/me — get current user profile
// ══════════════════════════════════════════════════════════════
router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// ══════════════════════════════════════════════════════════════
// PUT /api/auth/me — update profile (name)
// ══════════════════════════════════════════════════════════════
router.put('/me', requireAuth, (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        const cleanFirst = validator.escape(String(firstName || '').trim()).slice(0, 50);
        const cleanLast = validator.escape(String(lastName || '').trim()).slice(0, 50);

        db.prepare(
            "UPDATE users SET first_name = ?, last_name = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(cleanFirst, cleanLast, req.user.id);

        logActivity(req.user.id, 'profile_updated', 'Updated profile details');

        res.json({
            message: 'Profile updated',
            user: { ...req.user, first_name: cleanFirst, last_name: cleanLast }
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ══════════════════════════════════════════════════════════════
// PUT /api/auth/change-password
// ══════════════════════════════════════════════════════════════
router.put('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
        }

        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        const match = await bcrypt.compare(currentPassword, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        db.prepare(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(hash, req.user.id);

        logActivity(req.user.id, 'password_changed', 'Changed account password');

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const cleanEmail = validator.normalizeEmail(email);
        const user = db.prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1').get(cleanEmail);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If an account exists with that email, a reset link has been sent' });
        }

        // Invalidate any existing reset tokens
        db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000).toISOString();

        db.prepare(
            'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)'
        ).run(user.id, resetToken, expiresAt);

        // Send email (non-blocking)
        sendPasswordResetEmail(user.email, resetToken).catch(err => {
            console.error('Failed to send reset email:', err.message);
        });

        res.json({ message: 'If an account exists with that email, a reset link has been sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Reset token is required' });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
        }

        // Find valid reset token
        const resetRecord = db.prepare(
            "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
        ).get(token);

        if (!resetRecord) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        // Hash new password and update user
        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const updateUser = db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?");
        const markUsed = db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?');

        const transaction = db.transaction(() => {
            updateUser.run(hash, resetRecord.user_id);
            markUsed.run(resetRecord.id);
        });
        transaction();

        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET /api/auth/preferences
// ══════════════════════════════════════════════════════════════
router.get('/preferences', requireAuth, (req, res) => {
    try {
        db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(req.user.id);
        const preferences = db.prepare(
            `SELECT newsletter_opt_in, product_alerts_opt_in, research_digest_opt_in, preferred_research_category, updated_at
             FROM user_preferences WHERE user_id = ?`
        ).get(req.user.id);

        res.json({ preferences });
    } catch (err) {
        console.error('Get preferences error:', err);
        res.status(500).json({ error: 'Failed to load preferences' });
    }
});

// ══════════════════════════════════════════════════════════════
// PUT /api/auth/preferences
// ══════════════════════════════════════════════════════════════
router.put('/preferences', requireAuth, (req, res) => {
    try {
        const validCategories = ['general', 'longevity', 'cognitive', 'recovery', 'metabolic'];
        const newsletterOptIn = req.body.newsletterOptIn ? 1 : 0;
        const productAlertsOptIn = req.body.productAlertsOptIn ? 1 : 0;
        const researchDigestOptIn = req.body.researchDigestOptIn ? 1 : 0;
        const preferredResearchCategory = String(req.body.preferredResearchCategory || 'general').trim().toLowerCase();

        if (!validCategories.includes(preferredResearchCategory)) {
            return res.status(400).json({ error: 'Invalid preferred category' });
        }

        db.prepare(
            `INSERT INTO user_preferences (user_id, newsletter_opt_in, product_alerts_opt_in, research_digest_opt_in, preferred_research_category, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET
               newsletter_opt_in = excluded.newsletter_opt_in,
               product_alerts_opt_in = excluded.product_alerts_opt_in,
               research_digest_opt_in = excluded.research_digest_opt_in,
               preferred_research_category = excluded.preferred_research_category,
               updated_at = datetime('now')`
        ).run(
            req.user.id,
            newsletterOptIn,
            productAlertsOptIn,
            researchDigestOptIn,
            preferredResearchCategory
        );

        logActivity(req.user.id, 'preferences_updated', 'Updated communication preferences');

        const preferences = db.prepare(
            `SELECT newsletter_opt_in, product_alerts_opt_in, research_digest_opt_in, preferred_research_category, updated_at
             FROM user_preferences WHERE user_id = ?`
        ).get(req.user.id);

        res.json({ message: 'Preferences updated', preferences });
    } catch (err) {
        console.error('Update preferences error:', err);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET /api/auth/saved-compounds
// ══════════════════════════════════════════════════════════════
router.get('/saved-compounds', requireAuth, (req, res) => {
    try {
        const compounds = db.prepare(
            `SELECT id, compound_slug, compound_name, created_at
             FROM saved_compounds
             WHERE user_id = ?
             ORDER BY created_at DESC`
        ).all(req.user.id);

        res.json({ compounds });
    } catch (err) {
        console.error('Get saved compounds error:', err);
        res.status(500).json({ error: 'Failed to load saved compounds' });
    }
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/saved-compounds
// ══════════════════════════════════════════════════════════════
router.post('/saved-compounds', requireAuth, (req, res) => {
    try {
        const slug = validator.escape(String(req.body.compoundSlug || '').trim().toLowerCase()).slice(0, 64);
        const name = validator.escape(String(req.body.compoundName || '').trim()).slice(0, 80);

        if (!slug || !name) {
            return res.status(400).json({ error: 'Compound name and slug are required' });
        }

        db.prepare(
            `INSERT INTO saved_compounds (user_id, compound_slug, compound_name)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, compound_slug) DO NOTHING`
        ).run(req.user.id, slug, name);

        logActivity(req.user.id, 'compound_saved', `Saved compound: ${name}`);

        res.status(201).json({ message: 'Compound saved successfully' });
    } catch (err) {
        console.error('Save compound error:', err);
        res.status(500).json({ error: 'Failed to save compound' });
    }
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/auth/saved-compounds/:id
// ══════════════════════════════════════════════════════════════
router.delete('/saved-compounds/:id', requireAuth, (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'Invalid saved compound id' });
        }

        const existing = db.prepare(
            'SELECT id, compound_name FROM saved_compounds WHERE id = ? AND user_id = ?'
        ).get(id, req.user.id);

        if (!existing) {
            return res.status(404).json({ error: 'Saved compound not found' });
        }

        db.prepare('DELETE FROM saved_compounds WHERE id = ? AND user_id = ?').run(id, req.user.id);
        logActivity(req.user.id, 'compound_removed', `Removed saved compound: ${existing.compound_name}`);

        res.json({ message: 'Saved compound removed' });
    } catch (err) {
        console.error('Delete saved compound error:', err);
        res.status(500).json({ error: 'Failed to remove saved compound' });
    }
});

// ══════════════════════════════════════════════════════════════
// GET /api/auth/activity
// ══════════════════════════════════════════════════════════════
router.get('/activity', requireAuth, (req, res) => {
    try {
        const activity = db.prepare(
            `SELECT id, activity_type, description, created_at
             FROM account_activity
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 20`
        ).all(req.user.id);

        res.json({ activity });
    } catch (err) {
        console.error('Get activity error:', err);
        res.status(500).json({ error: 'Failed to load activity' });
    }
});

module.exports = router;
