-- Redesign wine_locations: each row is a physical slot in a cellar.
-- wine_id NULL = empty slot, wine_id set = occupied. Quantity is dropped
-- (1 slot = 1 bottle). Shelf/row/column are now required.
-- Existing rows are wiped — feature was not yet in real use.

DELETE FROM wine_locations;

ALTER TABLE wine_locations DROP COLUMN quantity;

ALTER TABLE wine_locations
  ALTER COLUMN shelf SET NOT NULL,
  ALTER COLUMN "row" SET NOT NULL,
  ALTER COLUMN "column" SET NOT NULL;

ALTER TABLE wine_locations DROP CONSTRAINT wine_locations_wine_id_fkey;
ALTER TABLE wine_locations
  ALTER COLUMN wine_id DROP NOT NULL,
  ADD CONSTRAINT wine_locations_wine_id_fkey
    FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE SET NULL;

ALTER TABLE wine_locations
  ADD CONSTRAINT wine_locations_slot_unique UNIQUE (cellar_id, shelf, "row", "column");
