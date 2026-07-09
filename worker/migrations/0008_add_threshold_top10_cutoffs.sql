-- 0008 阈值快照补充 race top10 cutoff：让 survival / clear 都能按“同口径前10”放行上传。
ALTER TABLE score_thresholds ADD COLUMN score_top10_turns INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_thresholds ADD COLUMN score_top10_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_thresholds ADD COLUMN score_top10_gold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_thresholds ADD COLUMN clear_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_thresholds ADD COLUMN clear_top10_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE score_thresholds ADD COLUMN clear_top10_turns INTEGER NOT NULL DEFAULT 0;
