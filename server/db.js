/* ═══════════════════════════════════════════════════════════════
   HELYX — Database (SQLite via better-sqlite3)
   Wellness journal app — accounts, waitlist.
   ═══════════════════════════════════════════════════════════════ */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'helyx.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        email           TEXT    UNIQUE NOT NULL COLLATE NOCASE,
        password_hash   TEXT    NOT NULL,
        first_name      TEXT    NOT NULL DEFAULT '',
        last_name       TEXT    NOT NULL DEFAULT '',
        premium         INTEGER NOT NULL DEFAULT 0,
        premium_until   TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        email_verified  INTEGER NOT NULL DEFAULT 0,
        is_active       INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS password_resets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT    UNIQUE NOT NULL,
        expires_at  TEXT    NOT NULL,
        used        INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT    UNIQUE NOT NULL,
        ip_address  TEXT,
        user_agent  TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        expires_at  TEXT    NOT NULL
    );

    /* Waitlist — homepage "Get the app" email signups */
    CREATE TABLE IF NOT EXISTS waitlist (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT    UNIQUE NOT NULL COLLATE NOCASE,
        source      TEXT    NOT NULL DEFAULT 'web',
        ip_address  TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_token        ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_waitlist_email        ON waitlist(email);
`);

module.exports = db;
