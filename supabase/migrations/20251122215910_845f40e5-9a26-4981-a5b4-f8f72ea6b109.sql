-- Create function to clear tracking code when order is delivered
CREATE OR REPLACE FUNCTION public.clear_tracking_code_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.tracking_code = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically clear tracking code
DROP TRIGGER IF EXISTS trigger_clear_tracking_code ON public.orders;
CREATE TRIGGER trigger_clear_tracking_code
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_tracking_code_on_delivery();