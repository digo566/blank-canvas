-- Fix 1: Add authentication check to mark_abandoned_carts RPC
-- This prevents anonymous users from calling the function
CREATE OR REPLACE FUNCTION public.mark_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated restaurant owners to call this function
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only mark carts for the authenticated restaurant owner
  UPDATE public.carts
  SET is_abandoned = TRUE,
      abandoned_at = NOW()
  WHERE restaurant_id = auth.uid()
    AND updated_at < NOW() - INTERVAL '10 minutes'
    AND is_abandoned = FALSE
    AND id NOT IN (SELECT DISTINCT cart_id FROM public.orders WHERE cart_id IS NOT NULL);
END;
$$;

-- Fix 2: Add missing RLS policies for order_items table
-- Restaurant owners can manage their order items
CREATE POLICY "Owners can insert order items"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.restaurant_id = auth.uid()
  )
);

CREATE POLICY "Owners can update order items"
ON public.order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (orders.restaurant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Owners can delete order items"
ON public.order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (orders.restaurant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);