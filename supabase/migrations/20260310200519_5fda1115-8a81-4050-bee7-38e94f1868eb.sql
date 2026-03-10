
-- Add new columns to orders for table orders and scheduling
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Create restaurant_tables for QR code management
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  table_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their tables"
  ON public.restaurant_tables FOR ALL
  TO authenticated
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Public can view active tables"
  ON public.restaurant_tables FOR SELECT
  TO anon
  USING (is_active = true);
