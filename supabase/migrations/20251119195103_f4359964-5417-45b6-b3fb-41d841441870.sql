-- Create carts table to track customer shopping carts
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abandoned_at TIMESTAMP WITH TIME ZONE,
  is_abandoned BOOLEAN DEFAULT FALSE,
  contacted BOOLEAN DEFAULT FALSE
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update clients table to support authentication
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Enable RLS on new tables
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for carts
CREATE POLICY "Clients can view their own carts"
  ON public.carts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = carts.client_id 
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create their own carts"
  ON public.carts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = carts.client_id 
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own carts"
  ON public.carts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = carts.client_id 
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can view their carts"
  ON public.carts FOR SELECT
  USING (auth.uid() = restaurant_id);

-- RLS policies for cart_items
CREATE POLICY "Users can manage their cart items"
  ON public.cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      JOIN public.clients ON clients.id = carts.client_id
      WHERE carts.id = cart_items.cart_id 
      AND (clients.user_id = auth.uid() OR carts.restaurant_id = auth.uid())
    )
  );

-- Function to mark carts as abandoned after 10 minutes
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.carts
  SET is_abandoned = TRUE,
      abandoned_at = NOW()
  WHERE updated_at < NOW() - INTERVAL '10 minutes'
    AND is_abandoned = FALSE
    AND id NOT IN (SELECT DISTINCT cart_id FROM public.orders WHERE cart_id IS NOT NULL);
END;
$$;

-- Add cart_id to orders table to track which cart became an order
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cart_id UUID REFERENCES public.carts(id);

-- Trigger to update cart timestamp
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.carts
  SET updated_at = NOW()
  WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_cart_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION update_cart_timestamp();