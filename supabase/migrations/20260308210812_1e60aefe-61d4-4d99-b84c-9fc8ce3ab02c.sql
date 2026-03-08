
-- Create delivery_zones table
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  neighborhood_name text NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Restaurant owners can manage their delivery zones"
  ON public.delivery_zones FOR ALL
  USING (auth.uid() = restaurant_id)
  WITH CHECK (auth.uid() = restaurant_id);

-- Public read policy for store/AI
CREATE POLICY "Anyone can view delivery zones"
  ON public.delivery_zones FOR SELECT
  USING (true);

-- Add delivery_mode to profiles (delivery_only or delivery_and_pickup)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'delivery_and_pickup';
