CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  payload BLOB,
  iv BLOB,
  auth_tag BLOB,
  scheduled_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  delete_after_delivery INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS messages_due_idx
  ON messages(status, scheduled_at, available_at);

CREATE INDEX IF NOT EXISTS messages_retention_idx
  ON messages(status, sent_at, created_at);

CREATE TABLE IF NOT EXISTS blocked_recipients (
  email_hash TEXT PRIMARY KEY,
  blocked_at INTEGER NOT NULL
);
