-- 0006 改判审计：记录手工 / 自动的人类榜↔AI榜改判事件，便于追溯与回滚。
CREATE TABLE IF NOT EXISTS classification_events (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  score_id               TEXT NOT NULL,
  from_agent             TEXT NOT NULL,
  to_agent               TEXT NOT NULL,
  mode                   TEXT NOT NULL,                 -- manual | auto
  reason                 TEXT NOT NULL DEFAULT '',
  suspicion_score        INTEGER,
  suspicion_risk         TEXT NOT NULL DEFAULT '',
  suspicion_reasons_json TEXT NOT NULL DEFAULT '[]',
  workflow_run_id        TEXT NOT NULL DEFAULT '',
  workflow_run_url       TEXT NOT NULL DEFAULT '',
  workflow_sha           TEXT NOT NULL DEFAULT '',
  created                INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classification_events_score_created ON classification_events (score_id, created DESC);
CREATE INDEX IF NOT EXISTS idx_classification_events_created ON classification_events (created DESC);
