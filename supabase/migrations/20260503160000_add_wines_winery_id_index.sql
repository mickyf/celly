-- Index wines.winery_id to speed up "wines for a winery" lookups (used in
-- winery detail pages and the wines list winery filter). Other foreign-key
-- columns already have indexes.

CREATE INDEX IF NOT EXISTS wines_winery_id_idx ON wines(winery_id);
