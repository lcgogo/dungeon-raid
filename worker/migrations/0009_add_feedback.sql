CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  nickname   TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'suggestion',
  body       TEXT NOT NULL,
  version    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'open',
  created    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_public ON feedback (status, created DESC);
