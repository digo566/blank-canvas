-- Create storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('restaurant-images', 'restaurant-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

-- Storage policies for restaurant images
CREATE POLICY "Restaurant owners can upload their restaurant images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can update their restaurant images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can delete their restaurant images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view restaurant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'restaurant-images');

-- Storage policies for product images
CREATE POLICY "Restaurant owners can upload their product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Add logo and cover image to profiles
ALTER TABLE profiles 
ADD COLUMN logo_url TEXT,
ADD COLUMN cover_url TEXT,
ADD COLUMN opening_hours JSONB DEFAULT '{
  "monday": {"open": "08:00", "close": "22:00", "closed": false},
  "tuesday": {"open": "08:00", "close": "22:00", "closed": false},
  "wednesday": {"open": "08:00", "close": "22:00", "closed": false},
  "thursday": {"open": "08:00", "close": "22:00", "closed": false},
  "friday": {"open": "08:00", "close": "22:00", "closed": false},
  "saturday": {"open": "08:00", "close": "22:00", "closed": false},
  "sunday": {"open": "08:00", "close": "22:00", "closed": false}
}'::jsonb;

-- Add address to clients
ALTER TABLE clients 
ADD COLUMN address TEXT,
ADD COLUMN is_registered BOOLEAN DEFAULT false;

-- Add payment method and preparation time to orders
ALTER TABLE orders 
ADD COLUMN payment_method TEXT,
ADD COLUMN preparation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;

-- Add profit margin to products
ALTER TABLE products 
ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN profit_margin NUMERIC(5,2) GENERATED ALWAYS AS (
  CASE 
    WHEN cost_price > 0 THEN ((price - cost_price) / cost_price * 100)
    ELSE 0
  END
) STORED;

-- Create interactions table for WhatsApp history
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'phone', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their interactions"
ON interactions
FOR ALL
USING (auth.uid() = restaurant_id);

-- Create function to update order timestamps based on status
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'preparing' AND OLD.status = 'pending' THEN
    NEW.preparation_started_at = NOW();
  ELSIF NEW.status = 'ready' AND OLD.status = 'preparing' THEN
    NEW.ready_at = NOW();
  ELSIF NEW.status = 'delivered' AND OLD.status = 'ready' THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_timestamp_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamps();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_clients_restaurant_id ON clients(restaurant_id);