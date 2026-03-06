-- Fix function security by setting search_path

CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.carts
  SET updated_at = NOW()
  WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$;