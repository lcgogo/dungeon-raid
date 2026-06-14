-- D1 排行榜表。建库后执行（含测试期重建，会清空旧数据）：
--   npx wrangler d1 execute dungeon-raid-scores --remote --file=schema.sql
DROP TABLE IF EXISTS scores;
CREATE TABLE scores (
  id       TEXT PRIMARY KEY,           -- 同时是 KV 里录像的 key
  version  TEXT NOT NULL DEFAULT '',   -- 录制时的游戏版本（按版本分桶统计，不同版本不混排）
  race     TEXT NOT NULL,
  turns    INTEGER NOT NULL,
  level    INTEGER NOT NULL,
  gold     INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'play',  -- play=正式版上报 | share=分享触发的待验证
  verified INTEGER NOT NULL DEFAULT 0,    -- 0 待验证 | 1 已验证真实 | -1 验证失败(作弊/伪造)
  created  INTEGER NOT NULL
);
CREATE INDEX idx_rank ON scores (version, turns DESC, level DESC, gold DESC);
CREATE INDEX idx_race ON scores (version, race, turns DESC);
CREATE INDEX idx_pend ON scores (verified, turns DESC);
