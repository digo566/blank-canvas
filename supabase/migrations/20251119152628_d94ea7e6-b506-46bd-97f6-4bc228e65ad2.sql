-- Add fields for change information to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS needs_change boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_amount numeric;