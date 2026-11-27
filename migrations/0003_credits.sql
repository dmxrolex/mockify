ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0 CHECK(credits >= 0);
ALTER TABLE users ADD COLUMN welcome_claimed_at INTEGER;
ALTER TABLE users ADD COLUMN subscription_expires_at INTEGER;
CREATE TABLE export_charges (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('held','complete')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(id,user_id)
);
-- The balance test and debit execute in the same SQLite statement/transaction.
CREATE TRIGGER export_charge_balance BEFORE INSERT ON export_charges BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND credits>=NEW.amount)
    THEN RAISE(ABORT,'insufficient_credits') END;
END;
CREATE TRIGGER export_charge_debit AFTER INSERT ON export_charges BEGIN
  UPDATE users SET credits=credits-NEW.amount WHERE id=NEW.user_id;
END;
CREATE TRIGGER export_charge_refund AFTER DELETE ON export_charges WHEN OLD.status='held' BEGIN
  UPDATE users SET credits=credits+OLD.amount WHERE id=OLD.user_id;
END;
