/* ═══════════════════════════════════════════════════════════════
   HELYX — Database (SQLite via better-sqlite3)
   ═══════════════════════════════════════════════════════════════ */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'helyx.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
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

    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id                      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        newsletter_opt_in            INTEGER NOT NULL DEFAULT 1,
        product_alerts_opt_in        INTEGER NOT NULL DEFAULT 1,
        research_digest_opt_in       INTEGER NOT NULL DEFAULT 0,
        preferred_research_category  TEXT    NOT NULL DEFAULT 'general',
        updated_at                   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_compounds (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        compound_slug   TEXT    NOT NULL,
        compound_name   TEXT    NOT NULL,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, compound_slug)
    );

    CREATE TABLE IF NOT EXISTS account_activity (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type   TEXT    NOT NULL,
        description     TEXT    NOT NULL,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email           TEXT    NOT NULL COLLATE NOCASE,
        reference_id    TEXT    UNIQUE,
        payment_method  TEXT    NOT NULL DEFAULT 'crypto',
        amount_usd      REAL    NOT NULL,
        shipping_cost   REAL    NOT NULL DEFAULT 0,
        status          TEXT    NOT NULL DEFAULT 'pending',
        cart_items      TEXT    NOT NULL,
        first_name      TEXT    NOT NULL DEFAULT '',
        last_name       TEXT    NOT NULL DEFAULT '',
        institution     TEXT    NOT NULL DEFAULT '',
        address         TEXT    NOT NULL DEFAULT '',
        city            TEXT    NOT NULL DEFAULT '',
        state           TEXT    NOT NULL DEFAULT '',
        zip             TEXT    NOT NULL DEFAULT '',
        country         TEXT    NOT NULL DEFAULT 'United States',
        payment_url     TEXT,
        paid_at         TEXT,
        tx_hash         TEXT,
        currency        TEXT,
        network         TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_saved_compounds_user ON saved_compounds(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user_created ON account_activity(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_reference_id ON orders(reference_id);
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
`);

module.exports = db;
