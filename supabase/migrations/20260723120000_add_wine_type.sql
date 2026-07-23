-- Add wine_type (colour/category) to wines: red, white, rose, sparkling, dessert.
ALTER TABLE wines
  ADD COLUMN wine_type TEXT
  CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'dessert'));

CREATE INDEX IF NOT EXISTS idx_wines_wine_type ON wines (wine_type);
