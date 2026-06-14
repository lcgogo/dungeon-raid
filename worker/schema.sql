-- D1 排行榜表 —— 全量 schema 参照 / 测试期「清库重建」脚本（含 DROP TABLE，会清空旧数据！）：
--   npx wrangler d1 execute dungeon-raid-scores --remote --file=schema.sql
-- ⚠️ 线上 schema 变更不要用这个（会丢数据），改走迁移框架：
--   npx wrangler d1 migrations apply dungeon-raid-scores --remote   （见 migrations/）
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
