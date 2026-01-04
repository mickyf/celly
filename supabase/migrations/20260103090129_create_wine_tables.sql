-- Create wineries table
CREATE TABLE wineries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wines table
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  winery_id UUID REFERENCES wineries(id) ON DELETE RESTRICT,
  grapes TEXT[] NOT NULL DEFAULT '{}',
  vintage INTEGER,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  price DECIMAL(10,2),
  drink_window_start INTEGER,
  drink_window_end INTEGER,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasting_notes table
CREATE TABLE tasting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  tasted_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX wineries_user_id_idx ON wineries(user_id);
CREATE INDEX wines_user_id_idx ON wines(user_id);
CREATE INDEX wines_drink_window_idx ON wines(drink_window_start, drink_window_end);
CREATE INDEX wines_vintage_idx ON wines(vintage);
CREATE INDEX tasting_notes_wine_id_idx ON tasting_notes(wine_id);
CREATE INDEX tasting_notes_user_id_idx ON tasting_notes(user_id);

-- Enable Row Level Security
ALTER TABLE wineries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wines table
CREATE POLICY "Users can view their own wineries"
  ON wineries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wineries"
  ON wineries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wineries"
  ON wineries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wineries"
  ON wineries FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for wines table
CREATE POLICY "Users can view their own wines"
  ON wines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wines"
  ON wines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wines"
  ON wines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wines"
  ON wines FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for tasting_notes table
CREATE POLICY "Users can view their own tasting notes"
  ON tasting_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasting notes"
  ON tasting_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasting notes"
  ON tasting_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasting notes"
  ON tasting_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wineries_updated_at
  BEFORE UPDATE ON wineries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wines_updated_at
  BEFORE UPDATE ON wines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasting_notes_updated_at
  BEFORE UPDATE ON tasting_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for wine photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wine-images', 'wine-images', true);

-- Create storage policies
CREATE POLICY "Users can upload their own wine images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wine-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view wine images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wine-images');

CREATE POLICY "Users can update their own wine images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wine-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own wine images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wine-images' AND auth.uid()::text = (storage.foldername(name))[1]);
