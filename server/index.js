/* ═══════════════════════════════════════════════════════════════
   HELYX — Express Server
   Main entry point
   ═══════════════════════════════════════════════════════════════ */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes-auth');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// ── Security ──────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false // handled by HTML meta tags
}));

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

// ── Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Rate Limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
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

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// ── Static Files (serve frontend) ────────────────────────────
app.use(express.static(path.join(__dirname, '..'), {
    extensions: ['html']
}));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Fallback to index.html for SPA-like routes ───────────────
app.get('*', (req, res) => {
    // If requesting an API route that doesn't exist
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    // Serve the requested HTML file or fall back to index
    const filePath = path.join(__dirname, '..', req.path);
    res.sendFile(filePath, err => {
        if (err) {
            res.sendFile(path.join(__dirname, '..', 'index.html'));
        }
    });
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
