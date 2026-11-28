-- Saved Looks: whole-page designs a user can reuse. Free accounts keep 1, Premium 10.
CREATE TABLE IF NOT EXISTS looks (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
