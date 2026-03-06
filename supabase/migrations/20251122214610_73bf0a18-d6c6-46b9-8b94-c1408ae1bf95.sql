-- Add new status 'on_the_way' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'on_the_way';

-- Add tracking_code column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

-- Create index for faster tracking code lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create trigger to auto-generate tracking code on order insert
CREATE OR REPLACE FUNCTION set_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_tracking_code ON public.orders;
CREATE TRIGGER trigger_set_tracking_code
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION set_tracking_code();