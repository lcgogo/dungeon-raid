-- 0003 AI 榜（agent 维度）—— human | ai。提交时自报（默认 human），日后私有黑盒可改判（POST /classify）。
-- 默认 'human'，存量成绩全部归人类榜；AI/机器人成绩自报 'ai' 进 AI 榜，两榜互不混排。
ALTER TABLE scores ADD COLUMN agent TEXT NOT NULL DEFAULT 'human';
CREATE INDEX IF NOT EXISTS idx_rank_agent  ON scores (agent, version, turns DESC, level DESC, gold DESC);
CREATE INDEX IF NOT EXISTS idx_clear_agent ON scores (agent, cleared, version, level ASC, turns ASC);
