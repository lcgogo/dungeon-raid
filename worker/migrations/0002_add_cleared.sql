-- 0002 破关榜（v1.11.0）—— 新增 cleared 列 + 索引。
-- SQLite 的 ADD COLUMN 无 IF NOT EXISTS：仅在未加过该列的库上跑（迁移框架按 d1_migrations 记录确保只跑一次）。
ALTER TABLE scores ADD COLUMN cleared INTEGER NOT NULL DEFAULT 0;  -- 1=破关（撑过终焉10波），上破关榜（按最低等级）
CREATE INDEX IF NOT EXISTS idx_clear ON scores (cleared, version, level ASC, turns ASC);
