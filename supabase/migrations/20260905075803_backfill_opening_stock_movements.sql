-- Backfill an opening "in" movement for wines created before the app recorded one.
--
-- Creating a wine (manually, or as a new row in an order-document import) used to
-- write wines.quantity directly and leave no ledger entry. Only restocks of wines
-- you already owned produced a movement. The dashboard chart is built from
-- stock_movements, so those purchases had no event to step up on — it folded them
-- into its derived baseline instead, and the line only ever descended.
--
-- The opening quantity is whatever the current quantity cannot be explained by
-- existing movements:
--
--   opening = quantity - sum(in) + sum(out)
--
-- Only positive openings are inserted; a wine whose movements already account for
-- its quantity is left alone, so this is safe for wines added after the fix.
--
-- update_wine_quantity_trigger is disabled for the duration: these rows describe
-- history that already happened, and must not change any current quantity.

ALTER TABLE stock_movements DISABLE TRIGGER update_wine_quantity_trigger;

INSERT INTO stock_movements (wine_id, user_id, movement_type, quantity, movement_date, notes)
SELECT
  w.id,
  w.user_id,
  'in'::movement_type,
  opening.qty,
  COALESCE(w.created_at::date, CURRENT_DATE),
  NULL
FROM wines w
CROSS JOIN LATERAL (
  SELECT
    COALESCE(w.quantity, 0)
      - COALESCE(SUM(sm.quantity) FILTER (WHERE sm.movement_type = 'in'), 0)
      + COALESCE(SUM(sm.quantity) FILTER (WHERE sm.movement_type = 'out'), 0) AS qty
  FROM stock_movements sm
  WHERE sm.wine_id = w.id
) AS opening
WHERE opening.qty > 0;

ALTER TABLE stock_movements ENABLE TRIGGER update_wine_quantity_trigger;
