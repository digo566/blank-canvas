
-- Create function to increment coupon usage (avoids RLS issues)
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.coupons 
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = coupon_id_param;
END;
$$;
