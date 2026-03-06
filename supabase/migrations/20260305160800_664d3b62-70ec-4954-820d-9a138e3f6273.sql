CREATE OR REPLACE FUNCTION public.mark_abandoned_carts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  UPDATE public.carts
  SET is_abandoned = TRUE,
      abandoned_at = NOW()
  WHERE restaurant_id = auth.uid()
    AND updated_at < NOW() - INTERVAL '15 minutes'
    AND is_abandoned = FALSE
    AND id NOT IN (SELECT DISTINCT cart_id FROM public.orders WHERE cart_id IS NOT NULL);
END;
$function$;