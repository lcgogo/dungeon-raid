-- 0004 排行榜显示名（alias）：玩家自取的展示名，最长 12 汉字（显示宽度 24，字母按半宽计），与服务端生成的 id 无关，仅用于榜单展示。
ALTER TABLE scores ADD COLUMN name TEXT NOT NULL DEFAULT '';
