/* ═══════════════════════════════════════════════════════════════
   HELYX — Express Server
   Wellness journal — accounts, waitlist, password reset.
   ═══════════════════════════════════════════════════════════════ */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const authRoutes = require('./routes-auth');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: ['https://helyx.us', 'https://www.helyx.us', 'http://localhost:3000', 'http://localhost:8765'],
    credentials: true
}));

// ── Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// ── Rate Limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts — please try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const waitlistLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Slow down — try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// ── Static frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Waitlist signup
app.post('/api/waitlist', waitlistLimiter, (req, res) => {
    try {
        const raw = String((req.body && req.body.email) || '').trim();
        if (!raw || !validator.isEmail(raw)) {
            return res.status(400).json({ error: 'Please enter a valid email.' });
        }
        const email = validator.normalizeEmail(raw);
        const source = String((req.body && req.body.source) || 'web').slice(0, 32);
        const ip = req.ip || null;

        db.prepare(
            'INSERT OR IGNORE INTO waitlist (email, source, ip_address) VALUES (?, ?, ?)'
        ).run(email, source, ip);

        res.json({ message: "You're on the list." });
    } catch (err) {
        console.error('Waitlist error:', err);
        res.status(500).json({ error: 'Something went wrong — please try again.' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 for unmatched API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    next();
});

// Fallback to index.html for unmatched paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║       HELYX Server Running            ║');
    console.log(`  ║       http://localhost:${PORT}            ║`);
    console.log('  ╚═══════════════════════════════════════╝');
    console.log('');
});
