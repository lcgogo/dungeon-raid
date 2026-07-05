-- 0007 门槛维度扩展：让上传门槛可按种族 / 版本桶 / scope_kind 分类，并支持 fallback 解析。
ALTER TABLE score_thresholds ADD COLUMN race TEXT NOT NULL DEFAULT 'all';
ALTER TABLE score_thresholds ADD COLUMN target_race TEXT NOT NULL DEFAULT 'all';
ALTER TABLE score_thresholds ADD COLUMN version_bucket TEXT NOT NULL DEFAULT '';
ALTER TABLE score_thresholds ADD COLUMN requested_version_bucket TEXT NOT NULL DEFAULT '';
ALTER TABLE score_thresholds ADD COLUMN scope_kind TEXT NOT NULL DEFAULT 'recent3';
CREATE INDEX IF NOT EXISTS idx_score_thresholds_agent_race_version_kind ON score_thresholds (agent, race, version_bucket, scope_kind, computed DESC);
