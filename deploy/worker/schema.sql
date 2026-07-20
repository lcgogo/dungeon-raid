-- D1 排行榜表 —— 全量 schema 参照 / 测试期「清库重建」脚本（含 DROP TABLE，会清空旧数据！）。
-- 从仓库根执行：
--   npx wrangler d1 execute dungeon-raid-scores --remote --file=deploy/worker/schema.sql --config deploy/worker/wrangler.toml
-- ⚠️ 线上 schema 变更不要用这个（会丢数据），改走迁移框架：
--   迁移 SQL 放 worker/migrations/
--   npx wrangler d1 migrations apply dungeon-raid-scores --remote --config deploy/worker/wrangler.toml
DROP TABLE IF EXISTS scores;
CREATE TABLE scores (
  id       TEXT PRIMARY KEY,           -- 同时是 KV 里录像的 key
  version  TEXT NOT NULL DEFAULT '',   -- 录制时的游戏版本（按版本分桶统计，不同版本不混排）
  race     TEXT NOT NULL,
  turns    INTEGER NOT NULL,
  level    INTEGER NOT NULL,
  gold     INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'play',  -- play=正式版上报 | share=分享触发的待验证
  cleared  INTEGER NOT NULL DEFAULT 0,    -- 1=破关（撑过终焉10波），上破关榜（按最低等级）
  agent    TEXT NOT NULL DEFAULT 'human', -- human | ai（提交自报，日后黑盒可改判）；人类榜/AI榜分流
  name     TEXT NOT NULL DEFAULT '',      -- 玩家自取展示名（alias，最长12汉字/宽度24），仅榜单展示，与 id 无关
  verified INTEGER NOT NULL DEFAULT 0,    -- 0 待验证 | 1 已验证真实 | -1 验证失败(作弊/伪造)
  created  INTEGER NOT NULL
);
CREATE INDEX idx_rank  ON scores (version, turns DESC, level DESC, gold DESC);
CREATE INDEX idx_race  ON scores (version, race, turns DESC);
CREATE INDEX idx_pend  ON scores (verified, turns DESC);
CREATE INDEX idx_clear ON scores (cleared, version, level ASC, turns ASC);
CREATE INDEX idx_rank_agent  ON scores (agent, version, turns DESC, level DESC, gold DESC);
CREATE INDEX idx_clear_agent ON scores (agent, cleared, version, level ASC, turns ASC);

CREATE TABLE classification_events (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  score_id               TEXT NOT NULL,
  from_agent             TEXT NOT NULL,
  to_agent               TEXT NOT NULL,
  mode                   TEXT NOT NULL,
  reason                 TEXT NOT NULL DEFAULT '',
  suspicion_score        INTEGER,
  suspicion_risk         TEXT NOT NULL DEFAULT '',
  suspicion_reasons_json TEXT NOT NULL DEFAULT '[]',
  workflow_run_id        TEXT NOT NULL DEFAULT '',
  workflow_run_url       TEXT NOT NULL DEFAULT '',
  workflow_sha           TEXT NOT NULL DEFAULT '',
  created                INTEGER NOT NULL
);
CREATE INDEX idx_classification_events_score_created ON classification_events (score_id, created DESC);
CREATE INDEX idx_classification_events_created ON classification_events (created DESC);

CREATE TABLE score_thresholds (
  scope                    TEXT PRIMARY KEY,
  recent                   INTEGER NOT NULL,
  agent                    TEXT NOT NULL,
  race                     TEXT NOT NULL DEFAULT 'all',
  target_race              TEXT NOT NULL DEFAULT 'all',
  version_bucket           TEXT NOT NULL DEFAULT '',
  requested_version_bucket TEXT NOT NULL DEFAULT '',
  scope_kind               TEXT NOT NULL DEFAULT 'recent3',
  versions_json            TEXT NOT NULL DEFAULT '[]',
  total                    INTEGER NOT NULL DEFAULT 0,
  upload_min_turns         INTEGER NOT NULL DEFAULT 0,
  top1_turns               INTEGER NOT NULL DEFAULT 0,
  score_top10_turns        INTEGER NOT NULL DEFAULT 0,
  score_top10_level        INTEGER NOT NULL DEFAULT 0,
  score_top10_gold         INTEGER NOT NULL DEFAULT 0,
  clear_total              INTEGER NOT NULL DEFAULT 0,
  clear_top10_level        INTEGER NOT NULL DEFAULT 0,
  clear_top10_turns        INTEGER NOT NULL DEFAULT 0,
  p5                       INTEGER NOT NULL DEFAULT 0,
  p10                      INTEGER NOT NULL DEFAULT 0,
  p30                      INTEGER NOT NULL DEFAULT 0,
  p50                      INTEGER NOT NULL DEFAULT 0,
  p70                      INTEGER NOT NULL DEFAULT 0,
  p90                      INTEGER NOT NULL DEFAULT 0,
  computed                 INTEGER NOT NULL
);
CREATE INDEX idx_score_thresholds_computed ON score_thresholds (computed DESC);
CREATE INDEX idx_score_thresholds_agent_race_version_kind ON score_thresholds (agent, race, version_bucket, scope_kind, computed DESC);
