-- 0001 初始 schema —— 幂等、非破坏性。
-- 全新库：创建 scores 表与索引。已存在的线上库：全部 IF NOT EXISTS → no-op，绝不清空已有数据。
-- （注意：与 schema.sql 不同，这里没有 DROP TABLE。schema.sql 仅用于测试期「清库重建」。）
CREATE TABLE IF NOT EXISTS scores (
  id       TEXT PRIMARY KEY,           -- 同时是 KV 里录像的 key
  version  TEXT NOT NULL DEFAULT '',   -- 录制时的游戏版本（按版本分桶统计）
  race     TEXT NOT NULL,
  turns    INTEGER NOT NULL,
  level    INTEGER NOT NULL,
  gold     INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'play',  -- play=正式版上报 | share=分享触发的待验证
  verified INTEGER NOT NULL DEFAULT 0,    -- 0 待验证 | 1 已验证真实 | -1 验证失败(作弊/伪造)
  created  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rank ON scores (version, turns DESC, level DESC, gold DESC);
CREATE INDEX IF NOT EXISTS idx_race ON scores (version, race, turns DESC);
CREATE INDEX IF NOT EXISTS idx_pend ON scores (verified, turns DESC);
