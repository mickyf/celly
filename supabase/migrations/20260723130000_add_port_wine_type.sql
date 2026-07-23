-- Add 'port' to the allowed wine_type values.
ALTER TABLE wines DROP CONSTRAINT IF EXISTS wines_wine_type_check;
ALTER TABLE wines
  ADD CONSTRAINT wines_wine_type_check
  CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'dessert', 'port'));
