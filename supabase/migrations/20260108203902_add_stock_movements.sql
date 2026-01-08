-- Create enum for movement types
CREATE TYPE movement_type AS ENUM ('in', 'out');

-- Create stock_movements table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID REFERENCES wines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  movement_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX stock_movements_wine_id_idx ON stock_movements(wine_id);
CREATE INDEX stock_movements_user_id_idx ON stock_movements(user_id);
CREATE INDEX stock_movements_movement_date_idx ON stock_movements(movement_date DESC);

-- Enable Row Level Security
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stock movements"
  ON stock_movements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock movements"
  ON stock_movements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock movements"
  ON stock_movements FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update wine quantity after stock movement
CREATE OR REPLACE FUNCTION update_wine_quantity_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update wine quantity based on movement type
    IF NEW.movement_type = 'in' THEN
      UPDATE wines
      SET quantity = COALESCE(quantity, 0) + NEW.quantity
      WHERE id = NEW.wine_id;
    ELSIF NEW.movement_type = 'out' THEN
      UPDATE wines
      SET quantity = GREATEST(COALESCE(quantity, 0) - NEW.quantity, 0)
      WHERE id = NEW.wine_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the movement on deletion
    IF OLD.movement_type = 'in' THEN
      UPDATE wines
      SET quantity = GREATEST(COALESCE(quantity, 0) - OLD.quantity, 0)
      WHERE id = OLD.wine_id;
    ELSIF OLD.movement_type = 'out' THEN
      UPDATE wines
      SET quantity = COALESCE(quantity, 0) + OLD.quantity
      WHERE id = OLD.wine_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old movement and apply new movement
    IF OLD.movement_type = 'in' THEN
      UPDATE wines
      SET quantity = GREATEST(COALESCE(quantity, 0) - OLD.quantity, 0)
      WHERE id = OLD.wine_id;
    ELSIF OLD.movement_type = 'out' THEN
      UPDATE wines
      SET quantity = COALESCE(quantity, 0) + OLD.quantity
      WHERE id = OLD.wine_id;
    END IF;

    IF NEW.movement_type = 'in' THEN
      UPDATE wines
      SET quantity = COALESCE(quantity, 0) + NEW.quantity
      WHERE id = NEW.wine_id;
    ELSIF NEW.movement_type = 'out' THEN
      UPDATE wines
      SET quantity = GREATEST(COALESCE(quantity, 0) - NEW.quantity, 0)
      WHERE id = NEW.wine_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update wine quantity
CREATE TRIGGER update_wine_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_wine_quantity_on_movement();
