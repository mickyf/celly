-- Add bottle_size column to wines table
ALTER TABLE wines
ADD COLUMN bottle_size TEXT;

-- Add comment for documentation
COMMENT ON COLUMN wines.bottle_size IS 'Bottle size in centiliters or standard format (e.g., 75cl, 150cl, 375ml, etc.)';
