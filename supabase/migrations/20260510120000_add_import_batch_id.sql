ALTER TABLE wines ADD COLUMN import_batch_id uuid;
CREATE INDEX wines_import_batch_id_idx ON wines (user_id, import_batch_id) WHERE import_batch_id IS NOT NULL;

ALTER TABLE stock_movements ADD COLUMN import_batch_id uuid;
CREATE INDEX stock_movements_import_batch_id_idx ON stock_movements (user_id, import_batch_id) WHERE import_batch_id IS NOT NULL;
