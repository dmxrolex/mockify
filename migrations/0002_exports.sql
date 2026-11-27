CREATE TABLE IF NOT EXISTS exports (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  message_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (id, user_id)
);
