-- 0010 反馈回复：留言详情页的公开跟帖。
CREATE TABLE IF NOT EXISTS feedback_replies (
  id          TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL,
  nickname    TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL,
  version     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open',
  created     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_public ON feedback_replies (feedback_id, status, created ASC);
