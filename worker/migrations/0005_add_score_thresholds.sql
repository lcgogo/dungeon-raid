-- 0005 分位门槛快照：给 /seed 下发上传门槛与近似分位参考。
CREATE TABLE IF NOT EXISTS score_thresholds (
  scope            TEXT PRIMARY KEY,          -- 例: recent5:human
  recent           INTEGER NOT NULL,
  agent            TEXT NOT NULL,
  versions_json    TEXT NOT NULL DEFAULT '[]',
  total            INTEGER NOT NULL DEFAULT 0,
  upload_min_turns INTEGER NOT NULL DEFAULT 0,
  top1_turns       INTEGER NOT NULL DEFAULT 0,
  p5               INTEGER NOT NULL DEFAULT 0,
  p10              INTEGER NOT NULL DEFAULT 0,
  p30              INTEGER NOT NULL DEFAULT 0,
  p50              INTEGER NOT NULL DEFAULT 0,
  p70              INTEGER NOT NULL DEFAULT 0,
  p90              INTEGER NOT NULL DEFAULT 0,
  computed         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_score_thresholds_computed ON score_thresholds (computed DESC);
