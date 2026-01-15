-- Create cellars table
CREATE TABLE cellars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add location fields to wines table
ALTER TABLE wines
ADD COLUMN cellar_id UUID REFERENCES cellars(id) ON DELETE SET NULL,
ADD COLUMN shelf INTEGER,
ADD COLUMN "row" INTEGER,
ADD COLUMN "column" INTEGER;

-- Create indexes for performance
CREATE INDEX cellars_user_id_idx ON cellars(user_id);
CREATE INDEX wines_cellar_id_idx ON wines(cellar_id);

-- Enable Row Level Security
ALTER TABLE cellars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cellars table
CREATE POLICY "Users can view their own cellars"
  ON cellars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cellars"
  ON cellars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cellars"
  ON cellars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cellars"
  ON cellars FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at for cellars
CREATE TRIGGER update_cellars_updated_at
  BEFORE UPDATE ON cellars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN wines.cellar_id IS 'Reference to the cellar where the wine is stored';
COMMENT ON COLUMN wines.shelf IS 'The shelf number or identifier';
COMMENT ON COLUMN wines.row IS 'The row number within the shelf';
COMMENT ON COLUMN wines.column IS 'The column number within the row';
