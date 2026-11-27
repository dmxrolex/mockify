CREATE TABLE payment_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('credits','premium')),
  stars INTEGER NOT NULL CHECK(stars>0),
  credits INTEGER NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_url TEXT,
  checkout_id TEXT,
  checkout_answered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX payment_orders_user ON payment_orders(user_id,created_at);
CREATE TABLE payment_receipts (
  charge_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES payment_orders(id),
  user_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  paid_at INTEGER NOT NULL
);
CREATE TABLE payment_support (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
