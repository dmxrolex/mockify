-- Promo codes, their redemptions, signup source and promo discounts. The Worker also creates
-- these on first use (promo-api.js ensureSchema), so applying this is optional.
CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, kind TEXT NOT NULL, amount INTEGER NOT NULL, scope TEXT NOT NULL DEFAULT 'all', max_uses INTEGER, uses INTEGER NOT NULL DEFAULT 0, expires_at INTEGER, new_users_only INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS promo_redemptions (code TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (code, user_id));
CREATE TABLE IF NOT EXISTS promo_attempts (user_id TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS promo_attempts_user ON promo_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS users_created ON users(created_at);
ALTER TABLE users ADD COLUMN source TEXT;
ALTER TABLE users ADD COLUMN discount_percent INTEGER;
ALTER TABLE users ADD COLUMN discount_scope TEXT;
ALTER TABLE users ADD COLUMN discount_until INTEGER;
ALTER TABLE users ADD COLUMN discount_code TEXT;
ALTER TABLE payment_orders ADD COLUMN promo_code TEXT;
