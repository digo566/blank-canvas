-- Create a proper trigger function to set tracking code
CREATE OR REPLACE FUNCTION public.set_tracking_code_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  IF NEW.tracking_code IS NULL THEN
    LOOP
      code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
      SELECT EXISTS(SELECT 1 FROM public.orders WHERE tracking_code = code) INTO exists_check;
      EXIT WHEN NOT exists_check;
    END LOOP;
    NEW.tracking_code := code;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS set_tracking_code_trigger ON public.orders;
CREATE TRIGGER set_tracking_code_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tracking_code_on_insert();

-- Revoke direct execution of the trigger function from public roles
REVOKE EXECUTE ON FUNCTION public.set_tracking_code_on_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_tracking_code_on_insert() FROM authenticated;