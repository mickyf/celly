-- Create wine_locations table to support multiple locations per wine
CREATE TABLE wine_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE NOT NULL,
  shelf INTEGER,
  row INTEGER,
  column INTEGER,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity >= 0),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing data from wines table to wine_locations
INSERT INTO wine_locations (wine_id, cellar_id, shelf, "row", "column", quantity, user_id)
SELECT id, cellar_id, shelf, "row", "column", COALESCE(quantity, 1), user_id
FROM wines
WHERE cellar_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX wine_locations_wine_id_idx ON wine_locations(wine_id);
CREATE INDEX wine_locations_cellar_id_idx ON wine_locations(cellar_id);
CREATE INDEX wine_locations_user_id_idx ON wine_locations(user_id);

-- Enable Row Level Security
ALTER TABLE wine_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own wine locations"
  ON wine_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wine locations"
  ON wine_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wine locations"
  ON wine_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wine locations"
  ON wine_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Remove old columns from wines table
ALTER TABLE wines DROP COLUMN cellar_id;
ALTER TABLE wines DROP COLUMN shelf;
ALTER TABLE wines DROP COLUMN "row";
ALTER TABLE wines DROP COLUMN "column";

-- Create trigger for updated_at
CREATE TRIGGER set_wine_locations_updated_at
BEFORE UPDATE ON wine_locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
